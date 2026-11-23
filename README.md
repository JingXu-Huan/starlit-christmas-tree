# 星光圣诞树 · A Christmas Wish

一个可以挂照片、用手势旋转的冰蓝粒子圣诞树。使用 WebGL 绘制树身，使用 MediaPipe 在浏览器里识别手势。

## 本地运行

在仓库根目录执行以下命令，然后打开 http://localhost:8000 。

```sh
python3 -m http.server 8000
```

页面可直接部署到静态托管服务。远程访问时需使用 HTTPS 才能开启摄像头。

## 互动方式

- 上传照片后，照片挂在树上，并保存在当前浏览器的 IndexedDB 中。
- 拇指与食指连续捏合两次，中间松开。第一次放大照片，之后每组双捏合切换到下一张。
- 握拳收起照片，张开手掌并左右移动可以旋转树。
- 鼠标或触屏也可以拖动树、点击照片。键盘聚焦树后可用左右方向键旋转。

## 资源

手部模型、运行库与 WebAssembly 文件位于 [vendor/mediapipe](vendor/mediapipe)，随附 [Apache 2.0 许可](vendor/mediapipe/LICENSE)。

示例照片来自 Unsplash：[雪夜小镇](https://unsplash.com/photos/VrrUL_kA_zs)、[林间小屋](https://unsplash.com/photos/CUA2U4eT-Ys)、[冬日晨光](https://images.unsplash.com/photo-1483664852095-d6cc6870702d)、[圣诞市集](https://unsplash.com/photos/_dPGmiMpK7s)。
