import { createRouter, createWebHashHistory } from 'vue-router'
import Portfolio from '../views/Portfolio.vue'
import ScanHistory from '../views/ScanHistory.vue'
import TradeHistory from '../views/TradeHistory.vue'
import Algorithm from '../views/Algorithm.vue'
import WeeklyReport from '../views/WeeklyReport.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',        component: Portfolio },
    { path: '/scans',   component: ScanHistory },
    { path: '/trades',  component: TradeHistory },
    { path: '/algorithm', component: Algorithm },
    { path: '/report',  component: WeeklyReport },
  ],
})
