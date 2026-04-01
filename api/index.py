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
            # 優先從環境變數取得手動設定的 IG 商業帳號 ID
            ig_biz_id = os.environ.get('IG_BIZ_ID')
            
            # 如果沒設定或是自動尋找
            if not ig_biz_id:
                # 策略 1: 直接問 "me"
                me_direct_res = requests.get(
                    f"https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token={access_token}"
                )
                me_direct = me_direct_res.json()
                if 'instagram_business_account' in me_direct:
                    ig_biz_id = me_direct['instagram_business_account']['id']
            
            if not ig_biz_id:
                # 策略 2: 掃描用戶管理的所有粉專
                me_accounts_res = requests.get(
                    f"https://graph.facebook.com/v19.0/me/accounts?fields=name,instagram_business_account&access_token={access_token}"
                )
                me_accounts = me_accounts_res.json()
                
                if 'data' in me_accounts and len(me_accounts['data']) > 0:
                    for page in me_accounts['data']:
                        if 'instagram_business_account' in page:
                            ig_biz_id = page['instagram_business_account']['id']
                            break
                elif 'error' in me_accounts:
                    result = {"success": False, "message": f"臉書權限查詢失敗: {me_accounts['error'].get('message')}"}
                    self.wfile.write(json.dumps(result).encode('utf-8'))
                    return
                else:
                    debug_info = str(me_accounts)[:200]
                    result = {
                        "success": False, 
                        "message": f"找不到連結的 Instagram 專業帳號。請至 Vercel 設定 IG_BIZ_ID 為 17841463911183294。 (Debug: {debug_info})"
                    }
                    self.wfile.write(json.dumps(result).encode('utf-8'))
                    return
            
            if not ig_biz_id:
                result = {"success": False, "message": "API 無法識別您的 Instagram Business ID，請檢查 Token 權限。"}
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            # 步驟 B: 尋找對應網址的 Media ID
            parts = target_url.strip('/').split('/')
            shortcode = ""
            if "p" in parts:
                shortcode = parts[parts.index("p") + 1]
            elif "reels" in parts:
                shortcode = parts[parts.index("reels") + 1]
            elif "tv" in parts:
                shortcode = parts[parts.index("tv") + 1]
            else:
                shortcode = parts[-1]

            media_list_data = requests.get(
                f"https://graph.facebook.com/v19.0/{ig_biz_id}/media?fields=permalink,shortcode&limit=100&access_token={access_token}"
            ).json()
            
            if 'error' in media_list_data:
                result = {"success": False, "message": f"貼文列表讀取失敗: {media_list_data['error'].get('message')}"}
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            media_id = None
            if 'data' in media_list_data:
                for media in media_list_data['data']:
                    if media.get('shortcode') == shortcode or media.get('permalink', '').rstrip('/') == target_url:
                        media_id = media['id']
                        break
            
            if not media_id:
                result = {
                    "success": False, 
                    "message": f"在您的前 100 篇貼文中找不到該貼文 (短碼: {shortcode})。請確認該貼文是由此帳號發布的。"
                }
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            # 步驟 C: 抓取所有留言
            comments_res_data = requests.get(
                f"https://graph.facebook.com/v19.0/{media_id}/comments?fields=username,text&limit=1000&access_token={access_token}"
            ).json()
            
            if 'error' in comments_res_data:
                result = {"success": False, "message": f"留言讀取失敗: {comments_res_data['error'].get('message')}"}
                self.wfile.write(json.dumps(result).encode('utf-8'))
                return

            comments_list = comments_res_data.get('data', [])
            
            result = {
                "success": True,
                "data": [{"username": c['username'], "text": c['text']} for c in comments_list],
                "count": len(comments_list)
            }
            self.wfile.write(json.dumps(result).encode('utf-8'))

        except Exception as e:
            result = {"success": False, "message": f"後端程式執行出錯: {str(e)}"}
            self.wfile.write(json.dumps(result).encode('utf-8'))

        return
