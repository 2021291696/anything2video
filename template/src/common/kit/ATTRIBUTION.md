# kit/ 出处

以下文件移植自 [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)（Apache-2.0），
源路径 `assets/lib/`，逐字保留（仅文件头加了出处注释），逻辑未改：

- `motion.ts` / `rand.ts` / `shake.ts`（原 `helpers/`：velocityAt/lagged/dampedSettle、mulberry32、handheld）
- `DigitRoll.tsx` / `FlashCut.tsx` / `Caption.tsx` / `PageCam.tsx` / `ClipCard.tsx` / `VerticalTicker.tsx`

未移植（依赖 three.js，作参考源码保留在 skill 根 `gallery/lib-ref/`）：
`FlatPanel.tsx`、`helpers/camera.tsx`（3D Rig）。

原项目许可证副本：`LICENSE-THIRDPARTY/APACHE-2.0-video-shotcraft.txt`。
修改本目录文件时请在变更记录中注明；再分发时保留本文件与许可证副本。
