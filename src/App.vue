<template>
  <div class="layout">
    <nav class="sidebar">
      <div class="logo">💸 돈복사</div>
      <RouterLink to="/"><span class="nav-icon">📊</span><span class="nav-label">포트폴리오</span></RouterLink>
      <RouterLink to="/scans"><span class="nav-icon">🔍</span><span class="nav-label">스캔 이력</span></RouterLink>
      <RouterLink to="/trades"><span class="nav-icon">📋</span><span class="nav-label">매매 이력</span></RouterLink>
      <RouterLink to="/algorithm"><span class="nav-icon">⚙️</span><span class="nav-label">전략 현황</span></RouterLink>
    </nav>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f6fa;
  color: #1a1a2e;
  overflow-x: hidden;
  max-width: 100vw;
}

.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 200px;
  background: #1a1a2e;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: fixed;
  top: 0; left: 0; bottom: 0;
}

.sidebar .logo {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  padding: 0 12px 20px;
  border-bottom: 1px solid #2a2a4a;
  margin-bottom: 8px;
}

.sidebar a {
  color: #8888aa;
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
}

.sidebar a:hover { background: #2a2a4a; color: #fff; }
.sidebar a.router-link-active { background: #2563eb; color: #fff; }

.nav-icon { display: inline; margin-right: 4px; }
.nav-label { display: inline; }

.content {
  margin-left: 200px;
  padding: 32px;
  flex: 1;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: 64px;
    top: auto;
    flex-direction: row;
    padding: 0;
    justify-content: space-around;
    align-items: stretch;
    background: #fff;
    border-top: 1px solid #e5e7eb;
    box-shadow: 0 -2px 8px rgba(0,0,0,.06);
    z-index: 100;
  }
  .sidebar .logo { display: none; }
  .sidebar a {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 4px;
    border-radius: 0;
    font-size: 11px;
    gap: 4px;
    color: #9ca3af;
    background: none !important;
  }
  .sidebar a.router-link-active { color: #2563eb; background: none !important; }
  .sidebar a:hover { background: none !important; color: #2563eb; }
  .nav-icon { display: block; font-size: 22px; line-height: 1; }
  .nav-label { display: block; font-size: 11px; }
  .content {
    margin-left: 0;
    padding: 16px;
    padding-bottom: 80px;
    min-height: 100vh;
  }
}
</style>
