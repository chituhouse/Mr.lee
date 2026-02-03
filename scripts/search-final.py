#!/usr/bin/env python3
"""Final round: search Baidu for the exact account and similar duo contrast accounts."""
import asyncio
from playwright.async_api import async_playwright

SEARCHES = [
    ('"礼貌太太和emogirl" 抖音 粉丝 账号', '精确搜索'),
    ('"礼貌太太和emogirl" 小红书', '小红书搜索'),
    ('抖音 反差闺蜜 博主 账号 推荐 2025 2026', '反差闺蜜博主'),
    ('小红书 反差人设 双人博主 闺蜜账号 推荐 emo 甜妹', '反差双人账号'),
    ('抖音 性格反差 双人组合 搞笑博主 温柔 暴躁 2025', '性格反差组合'),
    ('方圆 阿爆 类似 博主 反差 搞笑 组合 抖音', '方圆阿爆类似'),
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

        for query, label in SEARCHES:
            print(f"\n{'='*60}")
            print(f"=== {label}: {query} ===")
            print('='*60)
            url = f'https://www.baidu.com/s?wd={query}'
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(2)
                text = await page.inner_text("body")
                lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 8]
                # Skip common noise
                skip = ['百度', '广告', '换一换', '相关搜索', '搜索设置', '实时热点', '资讯', '图片', '视频', '贴吧', '知道', '文库', '地图', '更多', '网页', '百度为您找', '输入法']
                for line in lines[:100]:
                    if any(s in line for s in skip) and len(line) < 20:
                        continue
                    print(line)
            except Exception as e:
                print(f"Error: {e}")

        await browser.close()

asyncio.run(run())
