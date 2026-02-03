#!/usr/bin/env python3
"""Search via Sogou and Bing with Playwright."""
import asyncio
from playwright.async_api import async_playwright

SEARCHES = [
    ('https://www.sogou.com/web?query="礼貌太太和emogirl"+抖音+小红书', '搜狗-精确'),
    ('https://www.sogou.com/web?query=反差闺蜜+双人博主+推荐+抖音+2025+组合', '搜狗-反差闺蜜'),
    ('https://www.sogou.com/web?query=抖音+性格反差+闺蜜组合+搞笑博主+推荐+类似方圆阿爆', '搜狗-类似方圆'),
    ('https://cn.bing.com/search?q=%22%E7%A4%BC%E8%B2%8C%E5%A4%AA%E5%A4%AA%E5%92%8Cemogirl%22+%E6%8A%96%E9%9F%B3+%E5%B0%8F%E7%BA%A2%E4%B9%A6&ensearch=0', '必应-精确'),
]

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()

        for url, label in SEARCHES:
            print(f"\n{'='*50}")
            print(f"{label}")
            print('='*50)
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(3)
                text = await page.inner_text("body")
                lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 10]
                printed = 0
                for line in lines:
                    if printed >= 50:
                        break
                    print(line)
                    printed += 1
            except Exception as e:
                print(f"Error: {e}")

        await browser.close()

asyncio.run(run())
