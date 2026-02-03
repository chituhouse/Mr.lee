#!/usr/bin/env python3
"""Search Douyin and Google for account info using Playwright headless browser."""
import asyncio
import sys
from playwright.async_api import async_playwright

KEYWORD = sys.argv[1] if len(sys.argv) > 1 else "礼貌太太和emogirl"

async def search_douyin(page, keyword):
    print(f"=== 抖音搜索: {keyword} ===")
    url = f"https://www.douyin.com/search/{keyword}?type=user"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(5)
        await page.screenshot(path="/tmp/dy-users.png", full_page=False)
        text = await page.inner_text("body")
        print(text[:4000])
    except Exception as e:
        print(f"Error: {e}")

async def search_google(page, keyword):
    print(f"\n\n=== Google搜索: {keyword} ===")
    url = f"https://www.google.com/search?q=%22{keyword}%22+%E6%8A%96%E9%9F%B3+OR+%E5%B0%8F%E7%BA%A2%E4%B9%A6+%E5%8D%9A%E4%B8%BB+%E7%B2%89%E4%B8%9D&hl=zh-CN&num=20"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(3)
        await page.screenshot(path="/tmp/google-search.png", full_page=False)
        text = await page.inner_text("body")
        print(text[:5000])
    except Exception as e:
        print(f"Error: {e}")

async def search_google_similar(page, keyword):
    print(f"\n\n=== Google搜索类似账号 ===")
    url = f"https://www.google.com/search?q=%22{keyword}%22+%E7%B1%BB%E4%BC%BC+%E8%B4%A6%E5%8F%B7+%E6%8E%A8%E8%8D%90&hl=zh-CN&num=20"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(3)
        text = await page.inner_text("body")
        print(text[:5000])
    except Exception as e:
        print(f"Error: {e}")

async def search_douyin_notes(page, keyword):
    print(f"\n\n=== 抖音视频搜索: {keyword} ===")
    url = f"https://www.douyin.com/search/{keyword}?type=video"
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(5)
        text = await page.inner_text("body")
        print(text[:4000])
    except Exception as e:
        print(f"Error: {e}")

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="zh-CN"
        )
        page = await ctx.new_page()

        await search_douyin(page, KEYWORD)
        await search_douyin_notes(page, KEYWORD)
        await search_google(page, KEYWORD)
        await search_google_similar(page, KEYWORD)

        await browser.close()

asyncio.run(run())
