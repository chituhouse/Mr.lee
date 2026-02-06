#!/bin/bash
# ============================================
# 服务器基础设施一次性设置脚本
# 用法: ssh tencent 'bash -s' < scripts/setup-server-infra.sh
# ============================================

set -euo pipefail

TASKS_DIR="/home/jarvis/tasks"
SITES_DIR="/home/jarvis/sites"
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

echo "=== Step 1: 检查域名配置 ==="
# 用户说服务器上有域名配置文件，搜索常见位置
for f in /etc/nginx/sites-*/* /etc/nginx/conf.d/* /home/jarvis/.domain /home/jarvis/jarvis-gateway/.env; do
  if [ -f "$f" ]; then
    echo "找到配置: $f"
    grep -i 'domain\|server_name' "$f" 2>/dev/null || true
  fi
done

echo ""
echo "=== Step 2: 安装/确认 Nginx ==="
if command -v nginx &>/dev/null; then
  echo "Nginx 已安装: $(nginx -v 2>&1)"
else
  echo "安装 Nginx..."
  sudo apt-get update && sudo apt-get install -y nginx
fi

echo ""
echo "=== Step 3: 安装 certbot (Let's Encrypt) ==="
if command -v certbot &>/dev/null; then
  echo "Certbot 已安装: $(certbot --version 2>&1)"
else
  echo "安装 certbot..."
  sudo apt-get install -y certbot python3-certbot-nginx
fi

echo ""
echo "=== Step 4: 创建工作目录 ==="
mkdir -p "$TASKS_DIR"
mkdir -p "$SITES_DIR"
echo "目录已创建: $TASKS_DIR, $SITES_DIR"

echo ""
echo "=== Step 5: 安装 pm2 ==="
if command -v pm2 &>/dev/null; then
  echo "pm2 已安装: $(pm2 -v 2>&1)"
else
  echo "安装 pm2..."
  npm install -g pm2
fi

echo ""
echo "=== Step 6: 配置 jarvis 用户的有限 sudo 权限 ==="
SUDOERS_FILE="/etc/sudoers.d/jarvis-nginx"
if [ -f "$SUDOERS_FILE" ]; then
  echo "sudoers 规则已存在"
else
  echo "创建 sudoers 规则..."
  sudo tee "$SUDOERS_FILE" > /dev/null << 'SUDOERS'
# jarvis 用户仅允许 nginx 测试和重载配置
jarvis ALL=(root) NOPASSWD: /usr/sbin/nginx -t
jarvis ALL=(root) NOPASSWD: /usr/sbin/nginx -s reload
jarvis ALL=(root) NOPASSWD: /bin/ln -sf /etc/nginx/sites-available/* /etc/nginx/sites-enabled/*
SUDOERS
  sudo chmod 0440 "$SUDOERS_FILE"
  echo "sudoers 规则已创建"
fi

echo ""
echo "=== Step 7: 创建 Nginx 通配符配置模板 ==="
# 这是默认的 catch-all 配置，实际任务的子域名配置由 deployer.js 动态生成
WILDCARD_CONF="$NGINX_SITES/wildcard-tasks"
if [ -f "$WILDCARD_CONF" ]; then
  echo "通配符配置已存在"
else
  echo "创建通配符默认配置..."
  sudo tee "$WILDCARD_CONF" > /dev/null << 'NGINX'
# 通配符子域名 catch-all（返回 404）
# 实际任务站点由 deployer.js 动态生成独立配置
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        return 404 '{"error": "Site not found"}';
        add_header Content-Type application/json;
    }
}
NGINX
  sudo ln -sf "$WILDCARD_CONF" "$NGINX_ENABLED/wildcard-tasks"
  echo "通配符配置已创建"
fi

echo ""
echo "=========================================="
echo "基础设施设置完成！"
echo ""
echo "接下来需要手动完成："
echo "1. 确认域名：检查上面输出的域名配置"
echo "2. DNS 设置：在域名管理后台添加 A 记录"
echo "   *.your-domain.com → 111.229.81.206"
echo "3. SSL 证书：运行以下命令获取通配符证书"
echo "   sudo certbot certonly --manual --preferred-challenges dns -d '*.your-domain.com'"
echo "4. 在 .env 中添加 TASK_DOMAIN=your-domain.com"
echo "=========================================="
