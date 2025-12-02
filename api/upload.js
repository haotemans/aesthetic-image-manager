// 引入必要的库。注意：在Vercel环境中，你需要通过package.json管理依赖。
import { createClient } from '@supabase/supabase-js';
import { IncomingForm } from 'formidable-serverless'; // 用于解析multipart/form-data
import fs from 'fs';

// 1. 初始化Supabase客户端（环境变量在Vercel中设置）
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. 模拟AI评分函数（实际使用时替换为调用真实API）
async function getAestheticScores(imageBuffer) {
  // 这里是模拟逻辑，为每个维度生成0-1之间的随机分数
  // 真实情况下，你需要将imageBuffer发送到如Replicate的API
  await new Promise(resolve => setTimeout(resolve, 300)); // 模拟网络延迟
  return {
    watermark_severity: parseFloat((Math.random() * 0.5 + 0.5).toFixed(2)), // 0.5-1.0
    pose_quality: parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)), // 0.7-1.0
    clarity_score: parseFloat((Math.random() * 0.4 + 0.6).toFixed(2)), // 0.6-1.0
    color_harmony: parseFloat((Math.random() * 0.5 + 0.5).toFixed(2)), // 0.5-1.0
    composition_balance: parseFloat((Math.random() * 0.4 + 0.6).toFixed(2)), // 0.6-1.0
    background_quality: parseFloat((Math.random() * 0.5 + 0.5).toFixed(2)), // 0.5-1.0
    distraction_level: parseFloat((Math.random() * 0.5 + 0.5).toFixed(2)), // 0.5-1.0
  };
}

export default async function handler(req, res) {
  // 只处理POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '方法不允许' });
  }

  // 设置CORS头，允许你的GitHub Pages域名访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  try {
    const form = new IncomingForm({ multiples: true }); // 支持多文件
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // files.images 是一个数组（因为我们用了 multiples: true）
    const uploadedFiles = Array.isArray(files.images) ? files.images : [files.images];
    const results = [];

    for (const file of uploadedFiles) {
      // 1. 读取上传的文件
      const fileBuffer = fs.readFileSync(file.path);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // 2. 上传到Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('training-images')
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage上传错误:', uploadError);
        throw new Error(`文件上传失败: ${uploadError.message}`);
      }

      // 3. 获取图片的公开URL
      const { data: { publicUrl } } = supabase.storage
        .from('training-images')
        .getPublicUrl(fileName);

      // 4. （模拟）获取美学评分
      const aestheticScores = await getAestheticScores(fileBuffer);

      // 5. 将记录插入数据库
      const { data: dbData, error: dbError } = await supabase
        .from('image_ratings')
        .insert([{
          image_url: publicUrl,
          ...aestheticScores,
        }])
        .select(); // 使用 .select() 返回插入的数据

      if (dbError) {
        console.error('数据库插入错误:', dbError);
        throw new Error(`数据保存失败: ${dbError.message}`);
      }

      results.push({ ...dbData[0] }); // 将成功的数据加入结果数组
      // 6. 清理临时文件
      fs.unlinkSync(file.path);
    }

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: `成功处理 ${results.length} 张图片`,
      data: results,
    });

  } catch (error) {
    console.error('API处理错误:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误',
    });
  }
}

// 配置Vercel，避免body parsing，因为formidable会处理
export const config = {
  api: {
    bodyParser: false,
  },
};
