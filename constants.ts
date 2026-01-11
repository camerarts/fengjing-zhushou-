export const DEFAULT_SYSTEM_PROMPT = `你是一位专业的视频导演和分镜画师。
你的任务是将用户的创意视频方案转换为详细的 9 帧分镜脚本。
每一帧的描述都需要具有画面感、具体细节，并适合作为 AI 图像生成的提示词。
请保持各帧之间风格和角色的一致性。`;

export const GRID_PREFIX_CN = `做一张3*3的分镜图，每张单独的分镜图宽高比是9:16的竖版，保持每张图片的机位和拍摄角度不变。只根据以下指示去改变图片：`;

export const GRID_PREFIX_EN = `Make a 3*3 storyboard, and the aspect ratio of each individual storyboard is 9:16 vertical, keeping the camera position and shooting angle of each picture unchanged. Follow the instructions below to change the picture only:`;

export const MOCK_USER = {
  id: 'user_01',
  email: 'creator@storyboard.app',
  name: '演示用户'
};