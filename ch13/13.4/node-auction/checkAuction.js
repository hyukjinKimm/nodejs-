const { scheduleJob } = require("node-schedule");
const { Op } = require("sequelize");
const { Good, Auction, User, sequelize } = require("./models");

module.exports = async () => {
  console.log("checkAuction");
  try {
    const targets = await Good.findAll({
      // 24시간이 지난 낙찰자 없는 경매들
      where: {
        SoldId: null,
        expiration: { [Op.lte]: new Date() },
      },
    });
    targets.forEach(async (good) => {
      const success = await Auction.findOne({
        where: { GoodId: good.id },
        order: [["bid", "DESC"]],
      });
      if (!success) {
        return;
      }
      await good.setSold(success.UserId);
      await User.update(
        {
          money: sequelize.literal(`money - ${success.bid}`),
        },
        {
          where: { id: success.UserId },
        }
      );
    });
    const ongoing = await Good.findAll({
      // 24시간이 지나지 않은 낙찰자 없는 경매들
      where: {
        SoldId: null,
        expiration: { [Op.gte]: new Date() },
      },
    });
    ongoing.forEach((good) => {
      const end = new Date(good.expiration);
      const job = scheduleJob(end, async () => {
        // 낙찰가 설정 코드
        const success = await Auction.findOne({
          where: { GoodId: good.id },
          order: [["bid", "DESC"]],
        });
        if (!success) {
          return;
        }
        await good.setSold(success.UserId);
        await User.update(
          {
            money: sequelize.literal(`money - ${success.bid}`),
          },
          {
            where: { id: success.UserId },
          }
        );
      });
      job.on("error", (err) => {
        console.error("스케줄링 에러", err);
      });
      job.on("success", () => {
        console.log("스케줄링 성공");
      });
    });
  } catch (error) {
    console.error(error);
  }
};
