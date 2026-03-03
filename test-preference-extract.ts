/**
 * 测试用户偏好提取（混合方案）
 */

import 'dotenv/config';
import { userPreferenceService } from './src/services/UserPreferenceService';

const testMessages = [
  '我喜欢听周杰伦的歌',      // 正则匹配
  '我喜欢流行音乐',          // LLM 提取
  '我不喜欢太吵的音乐',      // LLM 提取（否定句）
  '我家在朝阳区',            // 正则匹配
  '你好',                    // 无偏好
  '今天天气怎么样',          // 无偏好
];

async function test() {
  console.log('🧪 测试混合偏好提取:\n');

  for (const msg of testMessages) {
    console.log(`📝 "${msg}"`);
    const pref = await userPreferenceService.extractPreferenceFromMessage(msg);
    if (pref) {
      console.log(`   ✅ ${pref.category}.${pref.key} = ${pref.value} (置信度: ${pref.confidence}, 来源: ${pref.source})\n`);
    } else {
      console.log(`   ⏭️ 无偏好\n`);
    }
  }
}

test().catch(console.error);
