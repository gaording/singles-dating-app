<script setup>
import { ref, computed, onMounted } from 'vue'

// API 配置
const API_BASE = 'https://singlesting-api-vfhspouhaa.cn-hangzhou.fcapp.run'

// 状态
const myName = ref(localStorage.getItem('myName') || '')
const myAvatar = ref(localStorage.getItem('myAvatar') || '😊')
const todayMatch = ref(null)
const loading = ref(false)
const hasJoined = ref(false)
const showNameInput = ref(false)

// 报名表单
const joinForm = ref({
  name: '',
  avatar: '😊',
  topics: '' // 破冰话题
})

// 检查是否已报名
const checkJoined = () => {
  const myId = localStorage.getItem('myId')
  if (todayMatch.value && todayMatch.value.participants) {
    hasJoined.value = todayMatch.value.participants.some(p => p.id === myId)
  }
}

// 加载今日匹配状态
const loadTodayMatch = async () => {
  loading.value = true
  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch(`${API_BASE}/match?date=${today}`)
    const data = await res.json()
    todayMatch.value = data.match || null
    checkJoined()
  } catch (e) {
    console.error('加载失败:', e)
    // 降级：本地模拟
    todayMatch.value = null
  } finally {
    loading.value = false
  }
}

// 报名参加
const joinMatch = async () => {
  if (!joinForm.value.name.trim()) {
    showNameInput.value = true
    return
  }

  const myId = localStorage.getItem('myId') || `user_${Date.now()}`
  localStorage.setItem('myId', myId)
  localStorage.setItem('myName', joinForm.value.name)
  localStorage.setItem('myAvatar', joinForm.value.avatar)
  myName.value = joinForm.value.name
  myAvatar.value = joinForm.value.avatar

  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch(`${API_BASE}/match/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        participant: {
          id: myId,
          name: joinForm.value.name,
          avatar: joinForm.value.avatar,
          topics: joinForm.value.topics // 第一个人可以设置话题
        }
      })
    })
    const data = await res.json()
    todayMatch.value = data.match
    hasJoined.value = true
  } catch (e) {
    console.error('报名失败:', e)
    // 降级：本地模拟
    if (!todayMatch.value) {
      todayMatch.value = {
        date: new Date().toISOString().split('T')[0],
        participants: [],
        status: 'waiting'
      }
    }
    todayMatch.value.participants.push({
      id: myId,
      name: joinForm.value.name,
      avatar: joinForm.value.avatar,
      topics: joinForm.value.topics
    })
    hasJoined.value = true
  }
}

// 格式化时间
const formatDinnerTime = () => {
  const now = new Date()
  const hour = now.getHours()
  if (hour < 18) {
    return `今晚 18:30`
  } else if (hour < 19) {
    return `晚餐时间已到！`
  } else {
    return `今日晚餐匹配已结束`
  }
}

// 计算匹配状态
const matchStatus = computed(() => {
  if (!todayMatch.value) return 'empty'
  if (todayMatch.value.status === 'matched') return 'matched'
  if (todayMatch.value.participants?.length >= 2) return 'ready'
  if (todayMatch.value.participants?.length === 1) return 'waiting'
  return 'empty'
})

onMounted(loadTodayMatch)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-orange-50 to-white">
    <!-- 顶部 -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-bold text-orange-500">
          🍜 晚餐搭子
        </h1>
        <div class="text-sm text-gray-500">
          {{ formatDinnerTime() }}
        </div>
      </div>
    </header>

    <div class="max-w-lg mx-auto px-4 py-6">
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-4xl mb-3">⏳</div>
        <p class="text-gray-400">加载中...</p>
      </div>

      <!-- 未报名状态 -->
      <div v-else-if="!hasJoined" class="space-y-4">
        <!-- 说明卡片 -->
        <div class="bg-white rounded-2xl p-6 shadow-sm">
          <h2 class="text-lg font-bold text-gray-800 mb-2">
            今天想找人一起吃晚餐吗？
          </h2>
          <p class="text-gray-500 text-sm">
            报名后系统会随机匹配一位同事，今晚一起在公司餐厅用餐
          </p>
        </div>

        <!-- 报名表单 -->
        <div class="bg-white rounded-2xl p-6 shadow-sm">
          <!-- 姓名输入 -->
          <div class="mb-4">
            <label class="block text-sm text-gray-600 mb-2">你的名字</label>
            <input
              v-model="joinForm.name"
              type="text"
              placeholder="大家怎么叫你？"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <!-- 头像选择 -->
          <div class="mb-4">
            <label class="block text-sm text-gray-600 mb-2">选个头像</label>
            <div class="flex gap-3">
              <button
                v-for="emoji in ['😊', '😎', '🤓', '😄', '🙂', '🥳']"
                :key="emoji"
                @click="joinForm.avatar = emoji"
                :class="[
                  'text-2xl p-2 rounded-lg transition',
                  joinForm.avatar === emoji ? 'bg-orange-100 ring-2 ring-orange-300' : 'bg-gray-50'
                ]"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <!-- 破冰话题（可选） -->
          <div class="mb-4">
            <label class="block text-sm text-gray-600 mb-2">
              破冰话题 <span class="text-gray-400 text-xs">（可选，第一个报名的人设置）</span>
            </label>
            <input
              v-model="joinForm.topics"
              type="text"
              placeholder="例如：最近在追什么剧？"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <button
            @click="joinMatch"
            :disabled="!joinForm.name.trim()"
            :class="[
              'w-full py-4 rounded-xl font-medium transition text-lg',
              joinForm.name.trim()
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            ]"
          >
            🎉 报名参加今晚晚餐
          </button>
        </div>

        <!-- 当前等待人数 -->
        <div v-if="todayMatch?.participants?.length > 0" class="bg-orange-50 rounded-2xl p-4">
          <div class="flex items-center gap-2 text-orange-600 text-sm">
            <span>已有 {{ todayMatch.participants.length }} 人报名</span>
            <span v-if="todayMatch.participants.length === 1">，等你来凑一对！</span>
            <span v-else>，匹配中...</span>
          </div>
        </div>
      </div>

      <!-- 已报名状态 -->
      <div v-else class="space-y-4">
        <!-- 等待匹配 -->
        <div v-if="matchStatus === 'waiting'" class="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div class="text-5xl mb-4">⏳</div>
          <h2 class="text-lg font-bold text-gray-800 mb-2">等待匹配中...</h2>
          <p class="text-gray-500 text-sm">
            已有 {{ todayMatch.participants.length }} 人报名，等你来凑一对！
          </p>
          <div class="mt-4 flex justify-center gap-2">
            <span
              v-for="p in todayMatch.participants"
              :key="p.id"
              class="text-2xl"
            >
              {{ p.avatar }}
            </span>
          </div>
        </div>

        <!-- 匹配成功 -->
        <div v-else-if="matchStatus === 'matched'" class="bg-white rounded-2xl p-6 shadow-sm">
          <div class="text-center mb-4">
            <div class="text-5xl mb-2">🎊</div>
            <h2 class="text-lg font-bold text-gray-800">匹配成功！</h2>
          </div>

          <!-- 匹配的两个人 -->
          <div class="flex items-center justify-center gap-4 mb-4">
            <div class="text-center">
              <div class="text-4xl mb-1">{{ todayMatch.matched[0]?.avatar }}</div>
              <div class="text-sm text-gray-600">{{ todayMatch.matched[0]?.name }}</div>
            </div>
            <div class="text-2xl text-pink-400">💕</div>
            <div class="text-center">
              <div class="text-4xl mb-1">{{ todayMatch.matched[1]?.avatar }}</div>
              <div class="text-sm text-gray-600">{{ todayMatch.matched[1]?.name }}</div>
            </div>
          </div>

          <!-- 破冰话题 -->
          <div v-if="todayMatch.topic" class="bg-orange-50 rounded-xl p-4 mb-4">
            <div class="text-xs text-gray-500 mb-1">破冰话题</div>
            <div class="text-gray-800">{{ todayMatch.topic }}</div>
          </div>

          <!-- 用餐信息 -->
          <div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p class="mb-1">📍 公司餐厅</p>
            <p>🕐 今晚 18:30</p>
          </div>
        </div>

        <!-- 已报名等待中 -->
        <div v-else class="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div class="text-5xl mb-4">✅</div>
          <h2 class="text-lg font-bold text-gray-800 mb-2">已报名成功！</h2>
          <p class="text-gray-500 text-sm">
            等待晚餐时间匹配，记得回来查看结果
          </p>
        </div>

        <!-- 我的报名信息 -->
        <div class="bg-white rounded-2xl p-4 shadow-sm">
          <div class="flex items-center gap-3">
            <span class="text-3xl">{{ myAvatar }}</span>
            <div>
              <div class="font-medium">{{ myName }}</div>
              <div class="text-xs text-gray-400">已报名</div>
            </div>
          </div>
        </div>

        <!-- 刷新按钮 -->
        <button
          @click="loadTodayMatch"
          class="w-full py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition"
        >
          🔄 刷新查看匹配结果
        </button>
      </div>
    </div>
  </div>
</template>
