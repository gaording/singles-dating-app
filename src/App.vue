<script setup>
import { ref, computed, onMounted } from 'vue'

// API 配置 - 部署后更新这个地址
const API_BASE = 'https://singles-dating-api.YOUR_SUBDOMAIN.workers.dev/api'
// 本地开发时可以用：const API_BASE = 'http://localhost:8787/api'

// 状态
const events = ref([])
const currentView = ref('list') // list, create, detail
const currentEvent = ref(null)
const filterDistance = ref(5) // km
const loading = ref(false)
const error = ref(null)

// 从飞书 API 加载
const loadData = async () => {
  loading.value = true
  error.value = null

  try {
    const res = await fetch(`${API_BASE}/events`)
    const data = await res.json()

    if (data.events) {
      events.value = data.events
    } else {
      // 如果 API 不可用，使用 localStorage 作为降级方案
      const saved = localStorage.getItem('singles-events')
      if (saved) {
        events.value = JSON.parse(saved)
      } else {
        // 示例数据
        events.value = getDemoData()
      }
    }
  } catch (e) {
    console.error('API 加载失败，使用本地数据:', e)
    // 降级到 localStorage
    const saved = localStorage.getItem('singles-events')
    if (saved) {
      events.value = JSON.parse(saved)
    } else {
      events.value = getDemoData()
    }
  } finally {
    loading.value = false
  }
}

// 示例数据
const getDemoData = () => [
  {
    id: 'demo1',
    title: '周末火锅局',
    description: '想吃火锅了，找几个搭子一起拼桌',
    location: '海底捞(中关村店)',
    distance: 1.2,
    time: '周六 18:00',
    maxPeople: 6,
    currentPeople: 3,
    host: '吃货小王',
    hostAvatar: '👨',
    questions: [
      { q: '你的吃饭预算是多少？', options: ['50-100', '100-200', '200+'], answers: ['100-200', '100-200', '50-100'] },
      { q: '能接受辣吗？', options: ['不辣', '微辣', '中辣', '特辣'], answers: ['微辣', '中辣', '不辣'] },
      { q: '喜欢吃什么？', options: ['肉食动物', '素食主义', '海鲜控', '都行'], answers: ['肉食动物', '海鲜控', '都行'] }
    ],
    status: '招募中',
    createTime: Date.now() - 3600000
  },
  {
    id: 'demo2',
    title: '工作日午餐搭子',
    description: '国贸附近上班，找个饭搭子',
    location: '国贸商城',
    distance: 0.8,
    time: '工作日 12:00',
    maxPeople: 4,
    currentPeople: 2,
    host: '上班族小李',
    hostAvatar: '👩',
    questions: [
      { q: '午餐预算？', options: ['20-30', '30-50', '50+'], answers: ['30-50', '30-50'] },
      { q: '用餐时长？', options: ['30分钟', '1小时', '1.5小时'], answers: ['1小时', '30分钟'] },
      { q: '偏吃什么？', options: ['中式', '西式', '日韩', '随便'], answers: ['中式', '随便'] }
    ],
    status: '招募中',
    createTime: Date.now() - 7200000
  }
]

// 过滤活动
const filteredEvents = computed(() => {
  return events.value.filter(e => e.distance <= filterDistance.value && (e.status === '招募中' || e.status === 'open'))
})

// 新活动表单
const newEvent = ref({
  title: '',
  description: '',
  location: '',
  distance: 1,
  time: '',
  maxPeople: 4,
  questions: [
    { q: '', options: '' },
    { q: '', options: '' },
    { q: '', options: '' }
  ]
})

// 提交新活动
const submitEvent = async () => {
  if (!newEvent.value.title.trim()) return

  const event = {
    title: newEvent.value.title,
    description: newEvent.value.description,
    location: newEvent.value.location,
    distance: Number(newEvent.value.distance),
    time: newEvent.value.time,
    maxPeople: Number(newEvent.value.maxPeople),
    currentPeople: 1,
    host: '我',
    hostAvatar: '😊',
    questions: newEvent.value.questions.map(q => ({
      q: q.q,
      options: q.options.split(',').map(o => o.trim()),
      answers: []
    })),
    status: '招募中',
    createTime: Date.now()
  }

  try {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    })
    
    if (res.ok) {
      // 重新加载数据
      await loadData()
    } else {
      // 降级：直接添加到本地
      event.id = Date.now().toString()
      events.value.unshift(event)
      localStorage.setItem('singles-events', JSON.stringify(events.value))
    }
  } catch (e) {
    console.error('创建失败，使用本地存储:', e)
    event.id = Date.now().toString()
    events.value.unshift(event)
    localStorage.setItem('singles-events', JSON.stringify(events.value))
  }

  currentView.value = 'list'
}

// 参与表单
const joinAnswers = ref([])

// 参与活动
const joinEvent = async () => {
  if (!currentEvent.value) return

  const updatedEvent = {
    currentPeople: currentEvent.value.currentPeople + 1,
    questions: currentEvent.value.questions.map((q, i) => ({
      ...q,
      answers: [...q.answers, joinAnswers.value[i] || '']
    })),
    status: currentEvent.value.currentPeople + 1 >= currentEvent.value.maxPeople ? '已满员' : '招募中'
  }

  try {
    const res = await fetch(`${API_BASE}/events/${currentEvent.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          '当前人数': updatedEvent.currentPeople,
          '筛选问题': JSON.stringify(updatedEvent.questions),
          '状态': updatedEvent.status
        }
      })
    })

    if (res.ok) {
      await loadData()
    } else {
      // 降级：更新本地
      currentEvent.value.currentPeople = updatedEvent.currentPeople
      currentEvent.value.questions = updatedEvent.questions
      currentEvent.value.status = updatedEvent.status
      localStorage.setItem('singles-events', JSON.stringify(events.value))
    }
  } catch (e) {
    console.error('更新失败，使用本地存储:', e)
    currentEvent.value.currentPeople = updatedEvent.currentPeople
    currentEvent.value.questions = updatedEvent.questions
    currentEvent.value.status = updatedEvent.status
    localStorage.setItem('singles-events', JSON.stringify(events.value))
  }

  joinAnswers.value = []
  currentView.value = 'list'
}

// 查看详情
const viewDetail = (event) => {
  currentEvent.value = event
  joinAnswers.value = event.questions.map(() => '')
  currentView.value = 'detail'
}

// 格式化时间
const formatTime = (timestamp) => {
  const diff = Date.now() - timestamp
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

onMounted(loadData)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-pink-50 to-white">
    <!-- 顶部 -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-bold text-pink-500 cursor-pointer" @click="currentView = 'list'">
          💑 单身搭子
        </h1>
        <button
          @click="currentView = 'create'"
          class="bg-pink-500 text-white px-4 py-2 rounded-full text-sm hover:bg-pink-600 transition"
        >
          发起饭局
        </button>
      </div>
    </header>

    <!-- 列表页 -->
    <div v-if="currentView === 'list'" class="max-w-lg mx-auto px-4 py-4">
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-4xl mb-3">⏳</div>
        <p class="text-gray-400">加载中...</p>
      </div>

      <!-- 距离筛选 -->
      <div v-if="!loading" class="bg-white rounded-xl p-4 mb-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-600">附近 {{ filterDistance }} 公里</span>
          <span class="text-xs text-gray-400">{{ filteredEvents.length }} 个饭局</span>
        </div>
        <input
          v-model="filterDistance"
          type="range"
          min="1"
          max="20"
          class="w-full accent-pink-500"
        />
      </div>

      <!-- 活动列表 -->
      <div class="space-y-3">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          @click="viewDetail(event)"
          class="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition"
        >
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-medium text-gray-800">{{ event.title }}</h3>
            <span class="text-xs bg-pink-50 text-pink-500 px-2 py-1 rounded-full">
              {{ event.distance }}km
            </span>
          </div>
          <p class="text-sm text-gray-500 mb-3">{{ event.description }}</p>
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>📍 {{ event.location }}</span>
            <span>🕐 {{ event.time }}</span>
          </div>
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ event.hostAvatar }}</span>
              <span class="text-sm text-gray-600">{{ event.host }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-pink-500 font-medium">{{ event.currentPeople }}</span>
              <span class="text-gray-300">/</span>
              <span>{{ event.maxPeople }}人</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredEvents.length === 0" class="text-center py-12">
        <div class="text-4xl mb-3">🍽️</div>
        <p class="text-gray-400">附近没有饭局，发起一个吧</p>
      </div>
    </div>

    <!-- 创建页 -->
    <div v-else-if="currentView === 'create'" class="max-w-lg mx-auto px-4 py-4">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <h2 class="text-lg font-bold mb-4">发起饭局</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">饭局名称</label>
            <input
              v-model="newEvent.title"
              type="text"
              placeholder="例如：周末火锅局"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          <div>
            <label class="block text-sm text-gray-600 mb-1">描述</label>
            <textarea
              v-model="newEvent.description"
              rows="2"
              placeholder="简单描述一下这个饭局"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">地点</label>
              <input
                v-model="newEvent.location"
                type="text"
                placeholder="餐厅名称"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">距离(km)</label>
              <input
                v-model="newEvent.distance"
                type="number"
                placeholder="1"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">时间</label>
              <input
                v-model="newEvent.time"
                type="text"
                placeholder="周六 18:00"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">人数上限</label>
              <input
                v-model="newEvent.maxPeople"
                type="number"
                placeholder="4"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
          </div>

          <!-- 三个筛选问题 -->
          <div class="pt-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">筛选问题（用逗号分隔选项）</label>
            <div class="space-y-2">
              <div>
                <input
                  v-model="newEvent.questions[0].q"
                  type="text"
                  placeholder="问题1：例如 你的预算是多少？"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 mb-1"
                />
                <input
                  v-model="newEvent.questions[0].options"
                  type="text"
                  placeholder="选项：50-100, 100-200, 200+"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
                />
              </div>
              <div>
                <input
                  v-model="newEvent.questions[1].q"
                  type="text"
                  placeholder="问题2"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 mb-1"
                />
                <input
                  v-model="newEvent.questions[1].options"
                  type="text"
                  placeholder="选项用逗号分隔"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
                />
              </div>
              <div>
                <input
                  v-model="newEvent.questions[2].q"
                  type="text"
                  placeholder="问题3"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 mb-1"
                />
                <input
                  v-model="newEvent.questions[2].options"
                  type="text"
                  placeholder="选项用逗号分隔"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
                />
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              @click="submitEvent"
              class="flex-1 bg-pink-500 text-white py-3 rounded-xl hover:bg-pink-600 transition font-medium"
            >
              发布饭局
            </button>
            <button
              @click="currentView = 'list'"
              class="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情页 -->
    <div v-else-if="currentView === 'detail' && currentEvent" class="max-w-lg mx-auto px-4 py-4">
      <button
        @click="currentView = 'list'"
        class="text-pink-500 hover:text-pink-600 mb-3 flex items-center gap-1 text-sm"
      >
        ← 返回
      </button>

      <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-bold">{{ currentEvent.title }}</h2>
          <span
            :class="(currentEvent.status === '招募中' || currentEvent.status === 'open') ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-400'"
            class="text-xs px-2 py-1 rounded-full"
          >
            {{ currentEvent.status === 'open' ? '招募中' : currentEvent.status === 'full' ? '已满员' : currentEvent.status }}
          </span>
        </div>
        <p class="text-gray-600 text-sm mb-3">{{ currentEvent.description }}</p>
        <div class="text-sm text-gray-500 space-y-1">
          <p>📍 {{ currentEvent.location }}</p>
          <p>🕐 {{ currentEvent.time }}</p>
          <p>👥 {{ currentEvent.currentPeople }}/{{ currentEvent.maxPeople }} 人</p>
        </div>
        <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          <span class="text-xl">{{ currentEvent.hostAvatar }}</span>
          <span class="text-sm text-gray-600">{{ currentEvent.host }} 发起</span>
        </div>
      </div>

      <!-- 参与者回答统计 -->
      <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h3 class="font-medium mb-3">参与者回答</h3>
        <div class="space-y-3">
          <div v-for="(q, i) in currentEvent.questions" :key="i" class="border-b border-gray-50 pb-3 last:border-0">
            <p class="text-sm text-gray-600 mb-2">{{ q.q }}</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="opt in q.options"
                :key="opt"
                :class="[
                  'text-xs px-2 py-1 rounded-full',
                  q.answers.filter(a => a === opt).length > 0
                    ? 'bg-pink-50 text-pink-500'
                    : 'bg-gray-50 text-gray-400'
                ]"
              >
                {{ opt }} ({{ q.answers.filter(a => a === opt).length }})
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 参与表单 -->
      <div v-if="currentEvent.status === '招募中' || currentEvent.status === 'open'" class="bg-white rounded-xl p-4 shadow-sm">
        <h3 class="font-medium mb-3">回答问题参与饭局</h3>
        <div class="space-y-3">
          <div v-for="(q, i) in currentEvent.questions" :key="i">
            <p class="text-sm text-gray-600 mb-1">{{ q.q }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in q.options"
                :key="opt"
                @click="joinAnswers[i] = opt"
                :class="[
                  'text-sm px-3 py-1 rounded-full border transition',
                  joinAnswers[i] === opt
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'border-gray-200 hover:border-pink-300'
                ]"
              >
                {{ opt }}
              </button>
            </div>
          </div>
        </div>
        <button
          @click="joinEvent"
          :disabled="joinAnswers.some(a => !a)"
          :class="[
            'w-full mt-4 py-3 rounded-xl font-medium transition',
            joinAnswers.some(a => !a)
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-pink-500 text-white hover:bg-pink-600'
          ]"
        >
          参加饭局
        </button>
      </div>

      <div v-else class="text-center py-4 text-gray-400">
        已满员，看看其他饭局吧
      </div>
    </div>
  </div>
</template>
