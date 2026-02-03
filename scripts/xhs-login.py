#!/usr/bin/env python3
"""Launch Xiaohongshu, capture QR code for login, then save cookies."""
import asyncio
import sys
import json
from playwright.async_api import async_playwright

COOKIE_PATH = "/root/.openclaw/workspace/data/xhs-cookies.json"

async def run():
    action = sys.argv[1] if len(sys.argv) > 1 else "qrcode"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()

        if action == "qrcode":
            # Go to XHS and trigger login
            await page.goto("https://www.xiaohongshu.com", wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)
            
            # Click login button if exists
            try:
                login_btn = await page.query_selector('text=登录')
                if login_btn:
                    await login_btn.click()
                    await asyncio.sleep(2)
            except:
                pass
            
            # Screenshot the QR code
            await page.screenshot(path="/tmp/xhs-qrcode.png", full_page=False)
            print("QR code screenshot saved to /tmp/xhs-qrcode.png")
            print("Waiting for scan... (will check every 3 seconds for 120 seconds)")
            
            # Wait for login success - check if the page changes
            for i in range(40):
                await asyncio.sleep(3)
                # Check if logged in by looking for user-specific elements
                url = page.url
                cookies = await ctx.cookies()
                logged_in = any(c['name'] == 'web_session' for c in cookies)
                
                if logged_in:
                    print(f"\n✅ 登录成功！")
                    # Save cookies
                    import os
                    os.makedirs(os.path.dirname(COOKIE_PATH), exist_ok=True)
                    with open(COOKIE_PATH, 'w') as f:
                        json.dump(cookies, f, ensure_ascii=False, indent=2)
                    print(f"Cookies saved to {COOKIE_PATH}")
                    
                    # Take a screenshot to confirm
                    await page.screenshot(path="/tmp/xhs-loggedin.png", full_page=False)
                    print("Logged-in screenshot saved to /tmp/xhs-loggedin.png")
                    break
                
                if i % 5 == 0:
                    # Refresh QR if needed
                    await page.screenshot(path="/tmp/xhs-qrcode.png", full_page=False)
                    print(f"  [{i*3}s] Still waiting... QR refreshed.")
            else:
                print("\n⏰ Timeout. QR code expired.")

        await browser.close()

asyncio.run(run())
