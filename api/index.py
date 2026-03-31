from http.server import BaseHTTPRequestHandler
import json
from urllib import parse

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # 1. 解析前端傳來的 URL 參數
        s = self.path
        query = parse.parse_qs(parse.urlparse(s).query)
        post_url = query.get('url', [''])[0]
        
        # TODO: 未來這裡可以匯入 requests 模組，帶入存取權杖呼叫真實 IG Graph API
        # 例如: response = requests.get(f"https://graph.facebook.com/v19.0/{media_id}/comments...")
        
        # 2. 目前先由 Python 回傳模擬驗證資料，證明 API 確實串接成功
        mock_data = {
            "success": True,
            "message": f"Successfully parsed URL: {post_url}",
            "data": [
                {"username": "python_user_1", "text": "我是從 Python 後端 API 回傳的資料！"},
                {"username": "vercel_api", "text": "API 連線測試成功 ✨"},
                {"username": "ig_bot", "text": "未來這裡會替換成 IG 真實留言"},
            ]
        }
        
        # 3. 設定回傳 Header 為 JSON 並允許跨域 (CORS)
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # 4. 回傳 JSON 格式字串給前端 React
        self.wfile.write(json.dumps(mock_data).encode('utf-8'))
        return
