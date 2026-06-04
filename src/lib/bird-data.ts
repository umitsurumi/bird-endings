export const DIMENSIONS = ["S", "M", "E", "A", "O", "X"] as const;
export const SCORE_DIMENSIONS = [...DIMENSIONS, "P"] as const;
export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export type Dimension = (typeof DIMENSIONS)[number];
export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];
export type OptionLabel = (typeof OPTION_LABELS)[number];
export type Scores = Record<ScoreDimension, number>;
export type DimensionScores = Record<Dimension, number>;

export type Option = {
  label: OptionLabel;
  text: string;
  score: Partial<Record<ScoreDimension, number>>;
};

export type Question = {
  id: `Q${number}`;
  prompt: string;
  options: Option[];
};

export type BirdName =
  | "麻雀"
  | "柯尔鸭"
  | "燕子"
  | "北极燕鸥"
  | "游隼"
  | "信天翁"
  | "大鹅"
  | "海鸥"
  | "葵花凤头鹦鹉"
  | "猫头鹰"
  | "鲸头鹳"
  | "几维鸟"
  | "孔雀"
  | "喜鹊"
  | "丹顶鹤"
  | "蜂鸟"
  | "乌鸦"
  | "银喉长尾山雀"
  | "鸽子"
  | "KFC";

export type RegularBirdName = Exclude<BirdName, "鸽子" | "KFC">;

export type BirdResult = {
  name: BirdName;
  tag: string;
  text: string;
  profile?: DimensionScores;
  imageSrc?: string;
};

export const DIMENSION_LABELS: Record<ScoreDimension, string> = {
  S: "安定欲",
  M: "迁移欲",
  E: "表达欲",
  A: "攻击性",
  O: "秩序感",
  X: "意义焦虑",
  P: "鸽子分",
};

export const DIMENSION_DESCRIPTIONS: Record<Dimension, string> = {
  S: "想稳定、想有归属、重视日常生活",
  M: "向往远方、阶段性离开、人生在路上",
  E: "想被听见、想表达、情绪外放",
  A: "边界感强，会反击，会保护自己或同伴",
  O: "想把事情处理好，有责任感，维护规则",
  X: "关注意义、价值、自我证明、是否该做更多",
};

export const RANGES: Record<Dimension, { min: number; max: number }> = {
  S: { min: 0, max: 8 },
  M: { min: 0, max: 6 },
  E: { min: -3, max: 8 },
  A: { min: -2, max: 4 },
  O: { min: -3, max: 6 },
  X: { min: -4, max: 9 },
};

export const WEIGHTS: Record<Dimension, number> = {
  S: 1,
  M: 1.2,
  E: 1,
  A: 1.2,
  O: 1,
  X: 1,
};

export const FALLBACK_PRIORITY: RegularBirdName[] = [
  "麻雀",
  "柯尔鸭",
  "燕子",
  "北极燕鸥",
  "游隼",
  "信天翁",
  "大鹅",
  "海鸥",
  "葵花凤头鹦鹉",
  "猫头鹰",
  "鲸头鹳",
  "几维鸟",
  "孔雀",
  "喜鹊",
  "丹顶鹤",
  "蜂鸟",
  "乌鸦",
  "银喉长尾山雀",
];

export const QUESTIONS: Question[] = [
  {
    id: "Q1",
    prompt: "当生活终于进入一段比较平稳的时期，你第一反应更接近？",
    options: [
      { label: "A", text: "太好了，我想把这段日子认真过下去。", score: { S: 2, O: 1, X: -1 } },
      { label: "B", text: "这很好，但我会忍不住想：下一站会在哪里？", score: { M: 2, X: 1 } },
      { label: "C", text: "我反而有点不安，总觉得平稳后面藏着变化。", score: { X: 2, M: 1 } },
      { label: "D", text: "我不太在意稳不稳定，只要今天舒服就行。", score: { S: 1, O: -1, X: -2 } },
    ],
  },
  {
    id: "Q2",
    prompt: "你在人群中的默认状态是？",
    options: [
      { label: "A", text: "我会自然参与进去，气氛合适时也能带动别人。", score: { E: 2, S: 1 } },
      { label: "B", text: "我在旁边观察，熟了以后才会出声。", score: { E: -1, O: 1 } },
      { label: "C", text: "我不太想被注意，但希望真正懂的人能认出我。", score: { E: 1, A: -1, X: 1 } },
      { label: "D", text: "人多会消耗我，我更想保留自己的空间。", score: { E: -2, A: -1, S: -1 } },
    ],
  },
  {
    id: "Q3",
    prompt: "当你被误解时，你更可能？",
    options: [
      { label: "A", text: "解释清楚，不然我会一直惦记。", score: { E: 2, X: 1, O: 1 } },
      { label: "B", text: "算了，误解就误解，我不想耗在这里。", score: { E: -2, X: -1 } },
      { label: "C", text: "先看对方有没有越界，越界了我会反击。", score: { A: 2, O: 1 } },
      { label: "D", text: "我会想很多，但最后可能只表达出一小部分。", score: { E: 1, X: 2, A: -1 } },
    ],
  },
  {
    id: "Q4",
    prompt: "你面对压力时，通常怎么处理？",
    options: [
      { label: "A", text: "先把能做的事一件件做完。", score: { O: 2, X: 1 } },
      { label: "B", text: "拖一下，缓一下，等状态来了再说。", score: { O: -2, X: -1, P: 1 } },
      { label: "C", text: "找一个出口，把情绪释放出去。", score: { E: 2, A: 1 } },
      { label: "D", text: "表面没事，内心高速运转。", score: { X: 2, E: -1 } },
    ],
  },
  {
    id: "Q5",
    prompt: "你对“远方”的态度更接近？",
    options: [
      { label: "A", text: "我想去看看，哪怕回来后发现也就那样。", score: { M: 2, X: 1, O: -1 } },
      { label: "B", text: "我不是向往远方，我只是知道自己不能一直停在原地。", score: { M: 2, S: -1, X: 1 } },
      { label: "C", text: "远方很累，我更想把眼前的小日子过好。", score: { S: 2, M: -1, X: -1 } },
      { label: "D", text: "远方不远方无所谓，我主要是不想被当前生活困住。", score: { M: 1, A: 1, O: -1 } },
    ],
  },
  {
    id: "Q6",
    prompt: "如果一件事没有明确意义，但能让你快乐，你会？",
    options: [
      { label: "A", text: "快乐本身就够了，没必要过度解释。", score: { X: -2, S: 1 } },
      { label: "B", text: "我会享受，但事后可能还是会怀疑自己是不是太没出息。", score: { X: 2, S: 1 } },
      { label: "C", text: "我很难纯粹享受，总想知道它能不能带来什么。", score: { X: 2, O: 1 } },
      { label: "D", text: "我会享受，而且最好漂亮一点、热闹一点。", score: { E: 2, X: -1, O: -1 } },
    ],
  },
  {
    id: "Q7",
    prompt: "你和亲近的人发生分歧时，你更像？",
    options: [
      { label: "A", text: "我会尽量维持关系，不想把事情闹大。", score: { A: -1, S: 1, O: 1 } },
      { label: "B", text: "如果对方踩到我的底线，我会很明确地顶回去。", score: { A: 2, O: 1 } },
      { label: "C", text: "我会先退开，等自己想明白。", score: { E: -1, M: 1, X: 1, P: 1 } },
      { label: "D", text: "我可能会嘴上轻松，实际心里已经记账。", score: { A: 1, O: -1, X: 1 } },
    ],
  },
  {
    id: "Q8",
    prompt: "你更希望别人如何理解你？",
    options: [
      { label: "A", text: "不必理解我，只要别打扰我。", score: { E: -2, A: -1 } },
      { label: "B", text: "我希望被听见，但不想被简单定义。", score: { E: 2, X: 1 } },
      { label: "C", text: "我希望别人觉得我可靠，能把事情托住。", score: { O: 2, S: 1 } },
      { label: "D", text: "我希望别人觉得我有趣、鲜活、不是无聊的人。", score: { E: 2, O: -1, X: -1 } },
    ],
  },
  {
    id: "Q9",
    prompt: "当你意识到自己只是普通人时，你会？",
    options: [
      { label: "A", text: "松一口气，普通人也可以过得很好。", score: { X: -2, S: 2 } },
      { label: "B", text: "有点失落，但还是会继续把手头的事做好。", score: { X: 1, O: 2 } },
      { label: "C", text: "不甘心，我总觉得自己应该留下点什么。", score: { X: 2, E: 1 } },
      { label: "D", text: "普通不普通无所谓，我要先活得像我自己。", score: { A: 1, O: -1, X: -1 } },
    ],
  },
  {
    id: "Q10",
    prompt: "你最容易被哪种瞬间打动？",
    options: [
      { label: "A", text: "某个很普通的日子突然变得值得记住。", score: { S: 2, X: 1 } },
      { label: "B", text: "走了很远以后，发现自己真正想要的东西很近。", score: { M: 2, X: 1 } },
      { label: "C", text: "别人无意中理解了我，哪怕只有一点点。", score: { E: 1, X: 2 } },
      { label: "D", text: "什么也没发生，但阳光、风、气味刚刚好。", score: { S: 1, X: -2 } },
    ],
  },
  {
    id: "Q11",
    prompt: "如果你必须在以下四种生活里选一种，你选？",
    options: [
      { label: "A", text: "稳定、普通、没人催我证明自己。", score: { S: 2, X: -2 } },
      { label: "B", text: "自由、松散、想表达时就表达。", score: { E: 2, O: -2 } },
      { label: "C", text: "清醒、克制、把该做的事完成。", score: { O: 2, E: -1 } },
      { label: "D", text: "危险、未知，但我知道自己必须走下去。", score: { M: 2, X: 2 } },
    ],
  },
  {
    id: "Q12",
    prompt: "测试快结束了，你现在最真实的想法是？",
    options: [
      { label: "A", text: "看结果吧，我已经选完了。", score: { O: 1 } },
      { label: "B", text: "我想知道这个结果到底准不准。", score: { X: 1, E: 1 } },
      { label: "C", text: "我想发给别人看看他们是什么。", score: { E: 1, S: 1 } },
      { label: "D", text: "我等会儿再看，先去干点别的。", score: { P: 2 } },
    ],
  },
];

export const BIRD_RESULTS: Record<BirdName, BirdResult> = {
  麻雀: {
    name: "麻雀",
    tag: "晒太阳结局",
    imageSrc: "/endings/001.png",
    profile: { S: 2, M: -2, E: 0, A: -1, O: -1, X: -2 },
    text: "放轻松，你只是一个不需要宏大叙事的平凡小天才。今天没有意义也无所谓，只要今天有微风，有刚好吃饱的粮食，那就值得在这片树叶上多闭眼待一会儿。去他的 KPI，活着本身就是最大的胜利。",
  },
  柯尔鸭: {
    name: "柯尔鸭",
    tag: "贴贴结局",
    imageSrc: "/endings/002.png",
    profile: { S: 2, M: -1, E: 2, A: -2, O: 0, X: -2 },
    text: "远方太虚无，你只想要热气腾腾的当下和香喷喷的拥抱。去什么旷野啊，你的人生轨道就是找个最舒服的枕头，和喜欢的人或事物理直气壮地黏在一起。有情绪就嘎嘎叫出来，绝不委屈自己一秒。",
  },
  燕子: {
    name: "燕子",
    tag: "稳稳的幸福结局",
    imageSrc: "/endings/003.png",
    profile: { S: 2, M: -1, E: -1, A: 0, O: 2, X: 1 },
    text: "你有着惊人的兜底能力，无论世界怎么变，你总能一口一口泥把自己的生活重新筑好。不搞虚头巴脑的浪漫，把你交代的每一件事办妥，把平淡的日子维持下去，就是你最高级的性感。",
  },
  北极燕鸥: {
    name: "北极燕鸥",
    tag: "极限追光者结局",
    imageSrc: "/endings/004.png",
    profile: { S: -2, M: 2, E: 0, A: 1, O: 2, X: 2 },
    text: "平稳的生活只会让你感到溺水，你生来就是要横跨两极的。别怀疑自己是不是太过折腾，只有在飞向未知的极致疲惫里，你才能真切地感觉到自己活着。只要前方的光还在，你就永远在路上。",
  },
  游隼: {
    name: "游隼",
    tag: "绝对领空结局",
    imageSrc: "/endings/005.png",
    profile: { S: -1, M: 2, E: -2, A: 2, O: 1, X: 0 },
    text: "不要靠近你，不要定义你，更不要试图给你洗脑。你不需要多余的虚伪社交，只尊崇内心的目标。当有人越界，你会以三百公里的时速俯冲下去，教他们什么叫顶级捕食者的边界感。",
  },
  信天翁: {
    name: "信天翁",
    tag: "等风来结局",
    imageSrc: "/endings/006.png",
    profile: { S: -2, M: 2, E: -1, A: -1, O: -2, X: -1 },
    text: "计划不如变化，变化不如算啦。你不想被任何规则和坐标困住，方向可以慢慢找，风来了就先借风走一程。毕竟你懂得人生的终极松弛感：真正的高手，都是靠风力发电的。",
  },
  大鹅: {
    name: "大鹅",
    tag: "物理超度结局",
    imageSrc: "/endings/007.png",
    profile: { S: 2, M: -2, E: 1, A: 2, O: -2, X: -1 },
    text: "你今天的精神状态，已经不适合再跟人类文明讲道理了。谁敢踩你的底线，谁敢挡你的路，你就会让他明白什么叫充满生活气息的致命打击。惹到你，算是惹到活霸王龙了，战斗爽！",
  },
  海鸥: {
    name: "海鸥",
    tag: "整点薯条结局",
    imageSrc: "/endings/008.png",
    profile: { S: -1, M: 1, E: 2, A: 2, O: -2, X: -2 },
    text: "去码头整点薯条，是对抗世界无意义的最佳方式。你才不内耗，别人的眼光哪有嘴里的肉重要？脸皮厚一点，快乐多一点，做个没心没肺的法外狂徒，只要我不尴尬，世界就是我的游乐场。",
  },
  葵花凤头鹦鹉: {
    name: "葵花凤头鹦鹉",
    tag: "摇滚主唱结局",
    imageSrc: "/endings/009.png",
    profile: { S: 0, M: 0, E: 2, A: 1, O: -2, X: 2 },
    text: "压抑情感是不可能的，这辈子都不可能的。不开心就要大声尖叫，开心了就要疯狂甩头和拆家。你那极富抓马色彩的灵魂，必须站在这平庸生活的最 C 位尽情发疯，懂不了一点世故，但活得足够鲜活。",
  },
  猫头鹰: {
    name: "猫头鹰",
    tag: "脑内风暴结局",
    imageSrc: "/endings/010.png",
    profile: { S: 1, M: -1, E: -2, A: -1, O: 2, X: 2 },
    text: "表面呆若木鸡，内心《存在与虚无》。在所有人都睡去的深夜里，你还在高速运转，思考着这破烂宇宙的终极意义。别太苛求自己了，有时候，你只是需要稍微停止一会儿转动你的小脑瓜。",
  },
  鲸头鹳: {
    name: "鲸头鹳",
    tag: "已老实结局",
    imageSrc: "/endings/011.png",
    profile: { S: 1, M: -1, E: -2, A: 0, O: 0, X: -2 },
    text: "外界纷纷扰扰，你自岿然不动。别人以为深不可测，其实你只是在发呆。你已经掌握了解脱的终极奥义：只要我不给反应，就没有什么麻烦能真正消耗我。有一种超越生死的看破红尘感。",
  },
  几维鸟: {
    name: "几维鸟",
    tag: "隐形拥抱结局",
    imageSrc: "/endings/012.png",
    profile: { S: 2, M: -2, E: -2, A: -2, O: 0, X: 2 },
    text: "你总觉得自己不够好、不会飞、在人群里太过渺小透明。但在那些无人在意的角落里，你默默消化了太多的委屈和不甘。其实你不需要向天空证明什么，足够懂你的人，自然会为你降落。",
  },
  孔雀: {
    name: "孔雀",
    tag: "华丽退场结局",
    imageSrc: "/endings/013.png",
    profile: { S: 1, M: -1, E: 2, A: 0, O: 2, X: 1 },
    text: "即便是个普通人，也要做个有偶像包袱的精致普通人。你的人生不可以潦草，每场戏都要讲究。就算遇到一地鸡毛的事，你也会小心翼翼地整理好羽毛，昂着头，给这个世界留一个漂亮骄傲的背影。",
  },
  喜鹊: {
    name: "喜鹊",
    tag: "情报中心结局",
    imageSrc: "/endings/014.png",
    profile: { S: 2, M: -1, E: 2, A: 0, O: 2, X: -1 },
    text: "哪里有热闹，哪里有新鲜事，哪里就有你。你是个热心肠的生活收集癖，喜欢安排事，更喜欢吃瓜。生活对你来说就像一个巨大的盲盒，你每天叽叽喳喳，只为了从中拆出点乐子来。",
  },
  丹顶鹤: {
    name: "丹顶鹤",
    tag: "独善其身结局",
    imageSrc: "/endings/015.png",
    profile: { S: 1, M: -1, E: -2, A: -1, O: 2, X: 1 },
    text: "俗世实在太吵闹，你宁可和少数值得的人保持体面距离，也不愿被无意义的喧嚣拖进泥里。你习惯用克制和体面去面对生活的兵荒马乱。只要你不低头，你那清冷孤高大佬的人设，就永远不会在狗血的剧情里崩塌。",
  },
  蜂鸟: {
    name: "蜂鸟",
    tag: "强迫症引擎结局",
    imageSrc: "/endings/016.png",
    profile: { S: -2, M: 2, E: 0, A: 0, O: 2, X: 2 },
    text: "停不下来，根本停不下来！只要一秒钟不努力，你就会觉得要被时代抛弃了。你把自己活成了高帧率的微型马达，但实在撑不住的时候，也请给因为疯狂燃烧而快要爆炸的自己，稍微充一会电吧。",
  },
  乌鸦: {
    name: "乌鸦",
    tag: "腹黑解谜结局",
    imageSrc: "/endings/017.png",
    profile: { S: 0, M: 1, E: 1, A: 2, O: 0, X: 2 },
    text: "这个世界的荒诞你看得比谁都透，但你偏不点破，甚至还想在里面搞点恶作剧。聪明，清醒，且有点记仇。表面上波澜不惊，实际上小本本上早就把惹过你的人写得清清楚楚，智者永远冷眼旁观。",
  },
  银喉长尾山雀: {
    name: "银喉长尾山雀",
    tag: "萌系暴徒结局",
    imageSrc: "/endings/018.png",
    profile: { S: 2, M: -2, E: -1, A: 2, O: 0, X: -2 },
    text: "别被你那无害又软萌的外表骗了。你虽然看起来像个精致小巧的纯良糯米团子，但只要有人敢越过你的底线，你反击起来比谁都野。最高级的攻击性，就是用最可爱的脸，干最狠的事。",
  },
  鸽子: {
    name: "鸽子",
    tag: "咕咕咕结局",
    imageSrc: "/endings/019.png",
    text: "测试结果呢？被你咕了。你等会儿再看，先去干点别的吧。反正世界也不会因为你晚交一份答卷就毁灭，先放过自己，今天的事今天如果不做，明天还可以接着拖。",
  },
  KFC: {
    name: "KFC",
    tag: "疯狂星期四结局",
    imageSrc: "/endings/020.png",
    text: "你认真剖析了自我，正期待系统为你复杂的灵魂匹配一只绝世好鸟……但这都不重要！因为今天是肯德基疯狂星期四！谁能 V 我 50？别测什么心理状态了，没有什么精神内耗是一顿炸鸡解决不了的，如果有，那就加个蛋挞！",
  },
};

export const REGULAR_BIRD_NAMES = Object.values(BIRD_RESULTS)
  .filter((result): result is BirdResult & { name: RegularBirdName; profile: DimensionScores } => Boolean(result.profile))
  .map((result) => result.name);

export const BIRD_ORDER = Object.keys(BIRD_RESULTS) as BirdName[];
