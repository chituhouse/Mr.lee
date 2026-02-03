#!/usr/bin/env python3
"""Download Douyin video using f2 library."""
import asyncio
import sys
import os

sys.stdout.reconfigure(line_buffering=True)

URL = sys.argv[1] if len(sys.argv) > 1 else "https://v.douyin.com/m-Bt0MtBHj4/"
OUT_DIR = "/tmp/douyin_dl"

async def run():
    from f2.apps.douyin.handler import DouyinHandler
    
    # Minimal config for f2
    kwargs = {
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Referer": "https://www.douyin.com/",
        },
        "proxies": {"http://": None, "https://": None},
        "cookie": "",
        "timeout": 30,
        "path": OUT_DIR,
        "naming": "{create}_{desc}",
        "folderize": False,
        "mode": "post",
        "url": URL,
        "interval": "all",
        "lyric": False,
        "original": True,
    }
    
    os.makedirs(OUT_DIR, exist_ok=True)
    
    handler = DouyinHandler(kwargs)
    
    # Get aweme_id
    from f2.apps.douyin.utils import AwemeIdFetcher
    aweme_id = await AwemeIdFetcher.get_aweme_id(URL)
    print(f"Aweme ID: {aweme_id}", flush=True)
    
    # Fetch post detail
    detail = await handler.fetch_one_video(aweme_id)
    if detail:
        print(f"Title: {getattr(detail, 'desc', 'N/A')}", flush=True)
        print(f"Author: {getattr(detail, 'nickname', 'N/A')}", flush=True)
        
        # Try to get video URL
        video_url = getattr(detail, 'video_play_addr', None) or getattr(detail, 'play_addr', None)
        if video_url:
            print(f"Video URL: {str(video_url)[:200]}", flush=True)
        
        # Print all attributes for debugging
        for attr in dir(detail):
            if not attr.startswith('_'):
                val = getattr(detail, attr, None)
                if val and not callable(val) and str(val).strip():
                    print(f"  {attr}: {str(val)[:150]}", flush=True)
    else:
        print("Failed to fetch video detail", flush=True)

asyncio.run(run())
