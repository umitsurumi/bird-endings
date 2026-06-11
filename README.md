# bird-ending

鸟类转生测试。用户完成 12 道单选题后，系统根据隐藏维度得分和隐藏彩蛋规则匹配一种最终结局，并展示对应结果文案。

完整需求见 [docs/requirements.md](docs/requirements.md)。

## 功能范围

- 12 道单选题
- 20 种常规鸟类结局
- 2 种隐藏彩蛋鸟类结局：鸽子、鹩哥
- 1 种时间随机隐藏结局：KFC
- 6 个常规隐藏维度：安定欲、迁移欲、表达欲、攻击性、秩序感、意义焦虑
- 1 个独立鸽子彩蛋分
- 结果清晰度反馈
- 可选的第二接近鸟类提示
- 分享按钮和带二维码的结果图生成

## 匹配规则

答题后先累计 S、M、E、A、O、X 六个原始维度分，并单独累计 P 鸽子彩蛋分。常规维度会按调参后的分数范围归一化到 -2 到 2，再与 20 种常规鸟类画像计算加权曼哈顿距离。

迁移欲 M 与攻击性 A 权重为 1.2，其余维度权重为 1.0。距离最小的鸟类作为常规候选结果，同时记录第二接近结果、最小距离和距离差。

隐藏结局优先级为：

- KFC：北京时间星期四提交时，有 5% 概率触发
- 鹩哥：12 题中存在连续 8 题选择同一个选项时触发
- 鸽子：`P == 4` 时触发
- 常规鸟类：未触发隐藏结局时，使用加权曼哈顿距离匹配

常规结果平票时，先按鸟类画像独特性分决胜；仍相同时使用固定兜底优先级。

## 用户流程

1. 用户进入测试首页
2. 点击开始测试
3. 依次完成 12 道单选题
4. 系统计算维度分和隐藏彩蛋条件
5. 系统按 KFC、鹩哥、鸽子、常规鸟类的优先级决定最终结果
6. 用户查看结果页
7. 用户可分享结果页或生成结果图

## 技术栈

- Framework: Next.js App Router
- Language: TypeScript
- Rendering: request-time SSR
- Runtime: Node.js, suitable for Vercel Serverless Functions
- Database: none configured
- Deployment target: Vercel

## 开发

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 构建

```bash
npm run build
```

## 部署

Deploy directly to Vercel. No static export is configured, so dynamic SSR routes remain server-rendered on demand.
