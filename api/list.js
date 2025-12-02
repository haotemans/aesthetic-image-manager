import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // 只处理GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: '方法不允许' });
  }

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // 从数据库查询所有记录，按创建时间倒序排列
    const { data, error } = await supabase
      .from('image_ratings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    return res.status(200).json({
      success: true,
      data: data || [], // 确保总是返回一个数组
    });

  } catch (error) {
    console.error('列表API错误:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误',
    });
  }
}