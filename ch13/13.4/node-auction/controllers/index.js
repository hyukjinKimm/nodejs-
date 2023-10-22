const { Op } = require("sequelize");
const { Good, Auction, User, sequelize } = require("../models");
const schedule = require("node-schedule");

exports.renderMain = async (req, res, next) => {
  try {
    const goods = await Good.findAll({
      where: { SoldId: null, expiration: { [Op.gte]: new Date() } },
    });
    res.render("main", {
      title: "NodeAuction",
      goods,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.renderJoin = (req, res) => {
  res.render("join", {
    title: "회원가입 - NodeAuction",
  });
};

exports.renderGood = (req, res) => {
  res.render("good", { title: "상품 등록 - NodeAuction" });
};

exports.createGood = async (req, res, next) => {
  try {
    const { name, price, expiration } = req.body;

    //console.log(typeof expiration); string
    //console.log(new Date(expiration));

    let end = new Date();

    if (!expiration) {
      const now = new Date();
      end.setDate(now.getDate() + 1);
    } else {
      end = new Date(expiration);
    }

    const good = await Good.create({
      OwnerId: req.user.id,
      name,
      img: req.file.filename,
      price,
      expiration: end,
    });

    console.log("경매 종료 시간>", end);

    const job = schedule.scheduleJob(end, async () => {
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

    req.app.get("io").of("/").emit("good", good);
    res.redirect("/");
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.renderAuction = async (req, res, next) => {
  try {
    const [good, auction] = await Promise.all([
      Good.findOne({
        where: { id: req.params.id },
        include: {
          model: User,
          as: "Owner",
        },
      }),
      Auction.findAll({
        where: { GoodId: req.params.id },
        include: { model: User },
        order: [["bid", "ASC"]],
      }),
    ]);
    if (good.Owner.id === req.user.id) {
      return res.redirect("/?error=자신의 게시글 입니다.");
    }
    res.render("auction", {
      title: `${good.name} - NodeAuction`,
      good,
      auction,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.bid = async (req, res, next) => {
  try {
    const { bid, msg } = req.body;
    const good = await Good.findOne({
      where: { id: req.params.id },
      include: { model: Auction },
      order: [[{ model: Auction }, "bid", "DESC"]],
    });
    const user = await User.findOne({
      where: { id: req.user.id },
    });
    if (bid > user.money) {
      return res.status(403).send("갖고있는 돈보다 많이 배팅할 순 없습니다.");
    }
    if (!good) {
      return res.status(404).send("해당 상품은 존재하지 않습니다.");
    }

    if (good.price >= bid) {
      return res.status(403).send("시작 가격보다 높게 입찰해야 합니다.");
    }
    if (new Date(good.createdAt).valueOf() + 24 * 60 * 60 * 1000 < new Date()) {
      return res.status(403).send("경매가 이미 종료되었습니다");
    }
    if (good.Auctions[0]?.bid >= bid) {
      return res.status(403).send("이전 입찰가보다 높아야 합니다");
    }
    const result = await Auction.create({
      bid,
      msg,
      UserId: req.user.id,
      GoodId: req.params.id,
    });
    // 실시간으로 입찰 내역 전송
    req.app.get("io").of("auction").to(req.params.id).emit("bid", {
      bid: result.bid,
      msg: result.msg,
      nick: req.user.nick,
    });
    return res.send("ok");
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

exports.renderList = async (req, res, next) => {
  try {
    const goods = await Good.findAll({
      where: { SoldId: req.user.id },
      include: { model: Auction },
      order: [[{ model: Auction }, "bid", "DESC"]],
    });
    res.render("list", { title: "낙찰 목록 - NodeAuction", goods });
  } catch (error) {
    console.error(error);
    next(error);
  }
};
