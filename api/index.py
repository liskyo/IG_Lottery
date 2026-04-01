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
            # 步驟 A: 強力尋找 Instagram Business 帳號 ID
            # 我們會掃描用戶管理的所有粉專，找出有連結 IG 的那個
            me_accounts_res = requests.get(
                f"https://graph.facebook.com/v19.0/me/accounts?fields=name,instagram_business_account&access_token={access_token}"
            )
            me_accounts = me_accounts_res.json()
            
            ig_biz_id = None
            if 'data' in me_accounts:
                for page in me_accounts['data']:
                    if 'instagram_business_account' in page:
                        ig_biz_id = page['instagram_business_account']['id']
                        print(f"Found IG Biz ID: {ig_biz_id} from Page: {page.get('name')}")
                        break
            
            # 如果 me/accounts 找不到，試試 me 直接取得 (某些情況下)
            if not ig_biz_id:
                me_direct = requests.get(
                    f"https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token={access_token}"
                ).json()
                if 'instagram_business_account' in me_direct:
                    ig_biz_id = me_direct['instagram_business_account']['id']
            
            if not ig_biz_id:
                # 報錯時吐出更多 Debug 資訊
                debug_info = str(me_accounts)[:200]
                result = {
                    "success": False, 
                    "message": f"找不到連結的 Instagram 專業帳號。請確認您是粉專管理員，且產 Token 時已勾選該專頁。 (Debug: {debug_info})"
                }
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            # 步驟 B: 尋找對應網址的 Media ID
            # 網址格式可能是 /p/XXXXX/ 或 /reels/XXXXX/ 或 /tv/XXXXX/
            # 我們需要提取短碼 (shortcode)
            parts = target_url.strip('/').split('/')
            shortcode = ""
            if "p" in parts:
                shortcode = parts[parts.index("p") + 1]
            elif "reels" in parts:
                shortcode = parts[parts.index("reels") + 1]
            elif "tv" in parts:
                shortcode = parts[parts.index("tv") + 1]
            else:
                # 最後一招，取網址最後一段
                shortcode = parts[-1]

            # 抓取最近 50 篇貼文來比對 (增加搜尋範圍)
            media_list = requests.get(
                f"https://graph.facebook.com/v19.0/{ig_biz_id}/media?fields=permalink,shortcode&limit=50&access_token={access_token}"
            ).json()
            
            media_id = None
            if 'data' in media_list:
                for media in media_list['data']:
                    # 比對 Permalink 或 Shortcode
                    if media.get('shortcode') == shortcode or media.get('permalink', '').rstrip('/') == target_url:
                        media_id = media['id']
                        break
            
            if not media_id:
                result = {
                    "success": False, 
                    "message": f"在您的前 50 篇貼文中找不到該網址 (短碼: {shortcode})。請確認貼文是否屬於此帳號，或貼文是否為公開狀態。"
                }
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            # 步驟 C: 抓取所有留言
            # 抓取 1000 則
            comments_data = requests.get(
                f"https://graph.facebook.com/v19.0/{media_id}/comments?fields=username,text&limit=1000&access_token={access_token}"
            ).json()
            
            comments_list = comments_data.get('data', [])
            
            # 回傳給前端
            result = {
                "success": True,
                "data": [{"username": c['username'], "text": c['text']} for c in comments_list],
                "count": len(comments_list)
            }
            self.wfile.write(json.dumps(result).encode('utf-8'))

        except Exception as e:
            result = {"success": False, "message": f"API 發生關鍵錯誤: {str(e)}"}
            self.wfile.write(json.dumps(result).encode('utf-8'))

        return
