window.levels = [
  {
    id: "metro",
    title: "地铁通勤",
    quota: 4,
    endText: "到站下车",
    overtimeThresholdRange: [1, 3],
    warningEvent: {
      title: "糟糕",
      bodyTemplate: "糟糕，坐过站了！{lastTag}有这么好看吗！",
      tag: "坐过站",
      okText: "三二一跑啊",
      quitText: "要不辞职？"
    },
    tagPool: [
      { id: "memo" },
      { id: "social1" },
      { id: "social2" },
      { id: "chat" },
      { id: "shop" },
      { id: "ledger" },
      { id: "window" },
      { id: "map" },
      { id: "stranger" }
    ]
  },

  {
    id: "company",
    title: "公司",
    quota: 2,
    quotaIfPrevWarning: 1,
    endText: "打卡打卡",
    overtimeThresholdRange: [1, 3],
    warningEvent: {
      title: "糟糕",
      bodyTemplate: "我全勤奖呢，我放在这里这么大的一个全勤奖呢？！",
      tag: "差点迟到",
      okText: "再忍忍呢",
      quitText: "要不辞职？"
    },
    tagPool: [
      { id: "breakfast" },
      { id: "coffeeStore" },
      { id: "reception" }
    ]
  },

  {
    id: "meeting",
    title: "例会",
    quota: 4,
    endText: "散会散会",
    overtimeThresholdRange: [1, 3],
    warningEvent: {
      title: "糟糕",
      bodyTemplate: "领导刷新在你的面前问你怎么还不走。",
      tag: "会后被点",
      okText: "哈哈，哈哈",
      quitText: "要不辞职？"
    },
    tagPool: [
      { id: "report" },
      { id: "drift" },
      { id: "coworker" },
      { id: "boss" },
      { id: "doc" },
      { id: "blame" }
    ]
  },

  {
    id: "pantry",
    title: "茶水间",
    quota: 3,
    endText: "回去上班",
    overtimeThresholdRange: [1, 3],
    warningEvent: {
      title: "糟糕",
      bodyTemplate: "第三次在茶水间见到同事的时候，同事也第三次见到了你。",
      tag: "茶水间偶遇",
      okText: "喝水有利健康",
      quitText: "要不辞职？"
    },
    tagPool: [
      { id: "coffee" },
      { id: "tea" },
      { id: "snack" },
      { id: "gossip" },
      { id: "pretend" }
    ]
  },

  {
    id: "desk",
    title: "工位",
    quota: 8,
    endText: "工作一下",
    overtimeThresholdRange: [1, 3],
    warningEvent: {
      title: "糟糕",
      bodyTemplate: "电脑屏幕在熄灭的一瞬间反射出领导的大脸。",
      tag: "工位险情",
      okText: "见鬼而已",
      quitText: "要不辞职？"
    },
    tagPool: [
      { id: "daze" },
      { id: "jobs" },
      { id: "keyboard" },
      { id: "reader" },
      { id: "workchat" },
      { id: "workshop" },
      { id: "travel" },
      { id: "workledger" },
      { id: "eyedrops" },
      { id: "plant" }
    ]
  },

  {
    id: "lastHour",
    title: "下班倒计时",
    quota: 3,
    endText: "冲出公司",
    overtimeThresholdRange: [1, 3],
    warningEvent: {
      title: "糟糕",
      bodyTemplate: "下班不积极，态度有问题，很不高兴通知你：你被加班抓住了！",
      tag: "被抓住加班",
      okText: "不辛苦命苦",
      quitText: "要不辞职？"
    },
    tagPool: [
      { id: "washCup" },
      { id: "takeaway" },
      { id: "todo" },
      { id: "bag" },
      { id: "toilet" }
    ]
  }
];