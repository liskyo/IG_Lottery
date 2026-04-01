import os
import requests
import json
from urllib import parse
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # 1. 從環境變數取得存取權杖
        access_token = os.environ.get('IG_ACCESS_TOKEN')
        
        # 2. 解析前端傳來的貼文網址
        query = parse.parse_qs(parse.urlparse(self.path).query)
        post_url = query.get('url', [''])[0].strip()
        
        # 移除 URL 結尾的斜線以利比對
        target_url = post_url.rstrip('/')
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if not access_token:
            result = {"success": False, "message": "尚未設定 IG_ACCESS_TOKEN 環境變數"}
            self.wfile.write(json.dumps(result).encode('utf-8'))
            return

        try:
            # 步驟 A: 取得 Instagram Business 帳號 ID
            # 先找用戶授權的專頁
            me_accounts = requests.get(
                f"https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account&access_token={access_token}"
            ).json()
            
            ig_biz_id = None
            if 'data' in me_accounts and len(me_accounts['data']) > 0:
                # 取第一個有連結 IG 的專頁
                for page in me_accounts['data']:
                    if 'instagram_business_account' in page:
                        ig_biz_id = page['instagram_business_account']['id']
                        break
            
            if not ig_biz_id:
                result = {"success": False, "message": "找不到連結的 Instagram 專業帳號，請確認已連結臉書粉專"}
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            # 步驟 B: 尋找對應網址的 Media ID
            # 抓取最近 25 篇貼文來比對
            media_list = requests.get(
                f"https://graph.facebook.com/v19.0/{ig_biz_id}/media?fields=permalink&access_token={access_token}"
            ).json()
            
            media_id = None
            if 'data' in media_list:
                for media in media_list['data']:
                    # 比對網址 (忽略結尾斜線)
                    if media['permalink'].rstrip('/') == target_url:
                        media_id = media['id']
                        break
            
            if not media_id:
                # 嘗試簡單匹配短碼 (shortcode)
                # 網址通常長這樣: instagram.com/p/CXXXXXXX/
                parts = target_url.split('/')
                shortcode = parts[-1] if parts[-1] else parts[-2]
                
                result = {
                    "success": False, 
                    "message": f"在您的前 25 篇貼文中找不到該網址。請確認貼文是否屬於此帳號。 (短碼: {shortcode})"
                }
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            # 步驟 C: 抓取所有留言
            # 一次抓取 500 則 (Graph API 限制)
            comments_data = requests.get(
                f"https://graph.facebook.com/v19.0/{media_id}/comments?fields=username,text&limit=500&access_token={access_token}"
            ).json()
            
            comments = comments_data.get('data', [])
            
            # 回傳給前端
            result = {
                "success": True,
                "data": [{"username": c['username'], "text": c['text']} for c in comments],
                "count": len(comments)
            }
            self.wfile.write(json.dumps(result).encode('utf-8'))

        except Exception as e:
            result = {"success": False, "message": f"API 發生錯誤: {str(e)}"}
            self.wfile.write(json.dumps(result).encode('utf-8'))

        return
