// 关卡配置：目前只做 1 关（地铁通勤）
window.levels = [
  {
    id: "metro",
    title: "地铁通勤",
    quota: 4,
    endText: "到站下车",
    overtimeThresholdRange: [1, 3], // 超时触发警告阈值：1~3 随机
    warningEvent: {
      // 这里 body 会由 game.js 拼接最新点击标签
      // 你给定的文案模板：糟糕，坐过站了！[刚刚点击过的标签名称]有这么好看吗！
      title: "警告",
      tag: "坐过站"
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
  }
];