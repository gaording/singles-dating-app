<script setup>
import { ref, computed, onMounted } from 'vue'

// API 配置
const API_BASE = 'https://singlesting-api-vfhspouhaa.cn-hangzhou.fcapp.run'

// 状态
const currentView = ref('home') // home, create, quiz, result
const myInfo = ref({
  id: localStorage.getItem('myId') || '',
  name: localStorage.getItem('myName') || '',
  gender: localStorage.getItem('myGender') || '', // male, female
  avatar: localStorage.getItem('myAvatar') || '😊'
})
const todayMatch = ref(null)
const loading = ref(false)
const hasJoined = ref(false)
const isCreator = ref(false)

// 发起人设置题目
const createForm = ref({
  name: '',
  gender: '',
  avatar: '😊',
  questions: [
    { question: '', options: ['', '', ''], answer: 0 },
    { question: '', options: ['', '', ''], answer: 0 },
    { question: '', options: ['', '', ''], answer: 0 }
  ]
})

// 答题人的答案
const quizAnswers = ref([-1, -1, -1])

// 检查是否已参与
const checkJoined = () => {
  const myId = localStorage.getItem('myId')
  if (todayMatch.value) {
    if (todayMatch.value.creator?.id === myId) {
      isCreator.value = true
      hasJoined.value = true
    } else if (todayMatch.value.matched?.some(p => p.id === myId)) {
      hasJoined.value = true
    } else if (todayMatch.value.failedAttempts?.some(p => p.id === myId)) {
      hasJoined.value = true
      currentView.value = 'result' // 答题失败
    }
  }
}

// 加载今日匹配
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
  } finally {
    loading.value = false
  }
}

// 发起匹配
const createMatch = async () => {
  if (!createForm.value.name.trim() || !createForm.value.gender) {
    return
  }

  const myId = localStorage.getItem('myId') || `user_${Date.now()}`
  localStorage.setItem('myId', myId)
  localStorage.setItem('myName', createForm.value.name)
  localStorage.setItem('myGender', createForm.value.gender)
  localStorage.setItem('myAvatar', createForm.value.avatar)
  
  myInfo.value = {
    id: myId,
    name: createForm.value.name,
    gender: createForm.value.gender,
    avatar: createForm.value.avatar
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch(`${API_BASE}/match/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        creator: {
          id: myId,
          name: createForm.value.name,
          gender: createForm.value.gender,
          avatar: createForm.value.avatar
        },
        questions: createForm.value.questions.filter(q => q.question.trim())
      })
    })
    const data = await res.json()
    todayMatch.value = data.match
    hasJoined.value = true
    isCreator.value = true
    currentView.value = 'result'
  } catch (e) {
    console.error('创建失败:', e)
  }
}

// 开始答题
const startQuiz = () => {
  currentView.value = 'quiz'
  quizAnswers.value = [-1, -1, -1]
}

// 提交答案
const submitQuiz = async () => {
  // 检查是否全部答对
  const questions = todayMatch.value.questions
  const allCorrect = questions.every((q, i) => quizAnswers.value[i] === q.answer)
  
  const myId = localStorage.getItem('myId') || `user_${Date.now()}`
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch(`${API_BASE}/match/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        participant: {
          id: myId,
          name: myInfo.value.name,
          gender: myInfo.value.gender,
          avatar: myInfo.value.avatar,
          answers: quizAnswers.value,
          allCorrect
        }
      })
    })
    const data = await res.json()
    todayMatch.value = data.match
    hasJoined.value = true
    currentView.value = 'result'
  } catch (e) {
    console.error('提交失败:', e)
  }
}

// 填写信息
const fillInfo = (gender) => {
  myInfo.value.gender = gender
  localStorage.setItem('myGender', gender)
}

const genderEmoji = computed(() => {
  return myInfo.value.gender === 'male' ? '👦' : '👧'
})

const oppositeGender = computed(() => {
  return todayMatch.value?.creator?.gender === 'male' ? 'female' : 'male'
})

const canJoin = computed(() => {
  return myInfo.value.gender && myInfo.value.gender !== todayMatch.value?.creator?.gender
})

onMounted(loadTodayMatch)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-pink-50 to-white">
    <!-- 顶部 -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
        <h1 class="text-xl font-bold text-pink-500">💕 晚餐搭子</h1>
        <div class="text-sm text-gray-500">今晚 18:30</div>
      </div>
    </header>

    <div class="max-w-lg mx-auto px-4 py-6">
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-4xl mb-3">⏳</div>
        <p class="text-gray-400">加载中...</p>
      </div>

      <!-- 首页 -->
      <div v-else-if="currentView === 'home'" class="space-y-4">
        <!-- 没有匹配 -->
        <div v-if="!todayMatch" class="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div class="text-5xl mb-4">🍽️</div>
          <h2 class="text-lg font-bold text-gray-800 mb-2">今天还没有人发起匹配</h2>
          <p class="text-gray-500 text-sm mb-4">成为第一个发起人，设置3道题等Ta来答</p>
          <button
            @click="currentView = 'create'"
            class="bg-pink-500 text-white px-6 py-3 rounded-xl hover:bg-pink-600 transition font-medium"
          >
            发起匹配
          </button>
        </div>

        <!-- 有人发起了 -->
        <div v-else class="space-y-4">
          <div class="bg-white rounded-2xl p-6 shadow-sm">
            <div class="text-center mb-4">
              <div class="text-4xl mb-2">{{ todayMatch.creator?.avatar }}</div>
              <h2 class="text-lg font-bold text-gray-800">
                {{ todayMatch.creator?.gender === 'male' ? '👦' : '👧' }} {{ todayMatch.creator?.name }}
                发起了匹配
              </h2>
              <p class="text-gray-500 text-sm mt-1">
                答对3道题就能一起吃晚餐
              </p>
            </div>

            <!-- 性别不匹配 -->
            <div v-if="myInfo.gender && myInfo.gender === todayMatch.creator?.gender" class="bg-gray-50 rounded-xl p-4 text-center">
              <p class="text-gray-500 text-sm">这是异性匹配，你是同性别哦~</p>
            </div>

            <!-- 已经匹配成功 -->
            <div v-else-if="todayMatch.matched?.length >= 2" class="bg-green-50 rounded-xl p-4 text-center">
              <p class="text-green-600 text-sm">已匹配成功！</p>
            </div>

            <!-- 可以参加 -->
            <div v-else-if="!hasJoined" class="space-y-4">
              <!-- 选择性别 -->
              <div v-if="!myInfo.gender" class="bg-gray-50 rounded-xl p-4">
                <p class="text-sm text-gray-600 mb-3">你是？</p>
                <div class="flex gap-3">
                  <button
                    @click="fillInfo('male')"
                    class="flex-1 py-3 rounded-xl border-2 border-blue-200 text-blue-500 hover:bg-blue-50 transition"
                  >
                    👦 男生
                  </button>
                  <button
                    @click="fillInfo('female')"
                    class="flex-1 py-3 rounded-xl border-2 border-pink-200 text-pink-500 hover:bg-pink-50 transition"
                  >
                    👧 女生
                  </button>
                </div>
              </div>

              <!-- 填名字 -->
              <div v-if="myInfo.gender && !myInfo.name" class="bg-gray-50 rounded-xl p-4">
                <input
                  v-model="myInfo.name"
                  type="text"
                  placeholder="你的名字"
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
                  @keyup.enter="localStorage.setItem('myName', myInfo.name)"
                />
                <div class="mt-3 flex gap-3 justify-center">
                  <button
                    v-for="emoji in ['😊', '😎', '🤓', '😄', '🙂', '🥳']"
                    :key="emoji"
                    @click="myInfo.avatar = emoji; localStorage.setItem('myAvatar', emoji)"
                    :class="[
                      'text-2xl p-2 rounded-lg transition',
                      myInfo.avatar === emoji ? 'bg-pink-100 ring-2 ring-pink-300' : 'bg-white'
                    ]"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>

              <!-- 开始答题按钮 -->
              <button
                v-if="myInfo.gender && myInfo.name"
                @click="startQuiz"
                class="w-full bg-pink-500 text-white py-4 rounded-xl hover:bg-pink-600 transition font-medium text-lg"
              >
                开始答题 🎯
              </button>
            </div>

            <!-- 已经参与过 -->
            <div v-else class="text-center py-4">
              <p class="text-gray-500">你已参与过</p>
              <button
                @click="currentView = 'result'"
                class="mt-2 text-pink-500 text-sm"
              >
                查看结果 →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 发起匹配页 -->
      <div v-else-if="currentView === 'create'" class="space-y-4">
        <div class="bg-white rounded-2xl p-6 shadow-sm">
          <h2 class="text-lg font-bold mb-4">发起匹配</h2>

          <!-- 性别选择 -->
          <div class="mb-4">
            <label class="block text-sm text-gray-600 mb-2">你是？</label>
            <div class="flex gap-3">
              <button
                @click="createForm.gender = 'male'"
                :class="[
                  'flex-1 py-3 rounded-xl border-2 transition',
                  createForm.gender === 'male'
                    ? 'border-blue-400 bg-blue-50 text-blue-500'
                    : 'border-gray-200 text-gray-400'
                ]"
              >
                👦 男生
              </button>
              <button
                @click="createForm.gender = 'female'"
                :class="[
                  'flex-1 py-3 rounded-xl border-2 transition',
                  createForm.gender === 'female'
                    ? 'border-pink-400 bg-pink-50 text-pink-500'
                    : 'border-gray-200 text-gray-400'
                ]"
              >
                👧 女生
              </button>
            </div>
          </div>

          <!-- 名字 -->
          <div class="mb-4">
            <label class="block text-sm text-gray-600 mb-2">你的名字</label>
            <input
              v-model="createForm.name"
              type="text"
              placeholder="大家怎么叫你？"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          <!-- 头像 -->
          <div class="mb-4">
            <label class="block text-sm text-gray-600 mb-2">选个头像</label>
            <div class="flex gap-3">
              <button
                v-for="emoji in ['😊', '😎', '🤓', '😄', '🙂', '🥳']"
                :key="emoji"
                @click="createForm.avatar = emoji"
                :class="[
                  'text-2xl p-2 rounded-lg transition',
                  createForm.avatar === emoji ? 'bg-pink-100 ring-2 ring-pink-300' : 'bg-gray-50'
                ]"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <!-- 设置题目 -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              设置 3 道选择题（让对方答）
            </label>
            <div class="space-y-4">
              <div v-for="(q, i) in createForm.questions" :key="i" class="bg-gray-50 rounded-xl p-4">
                <input
                  v-model="q.question"
                  type="text"
                  :placeholder="`问题 ${i + 1}`"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 mb-2"
                />
                <div class="space-y-1">
                  <div v-for="(opt, j) in q.options" :key="j" class="flex gap-2">
                    <input
                      v-model="q.options[j]"
                      type="text"
                      :placeholder="`选项 ${['A', 'B', 'C'][j]}`"
                      class="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm"
                    />
                    <button
                      @click="q.answer = j"
                      :class="[
                        'px-3 py-2 rounded-lg text-sm transition',
                        q.answer === j
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      ]"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              @click="createMatch"
              :disabled="!createForm.name.trim() || !createForm.gender"
              :class="[
                'flex-1 py-3 rounded-xl font-medium transition',
                createForm.name.trim() && createForm.gender
                  ? 'bg-pink-500 text-white hover:bg-pink-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              ]"
            >
              发起匹配
            </button>
            <button
              @click="currentView = 'home'"
              class="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      <!-- 答题页 -->
      <div v-else-if="currentView === 'quiz'" class="space-y-4">
        <div class="bg-white rounded-2xl p-6 shadow-sm">
          <div class="text-center mb-4">
            <div class="text-4xl mb-2">{{ todayMatch?.creator?.avatar }}</div>
            <h2 class="text-lg font-bold text-gray-800">
              {{ todayMatch?.creator?.name }} 的题目
            </h2>
            <p class="text-gray-500 text-sm">答对 3 题就能匹配成功</p>
          </div>

          <div class="space-y-6">
            <div v-for="(q, i) in todayMatch?.questions" :key="i" class="bg-gray-50 rounded-xl p-4">
              <p class="font-medium text-gray-800 mb-3">{{ i + 1 }}. {{ q.question }}</p>
              <div class="space-y-2">
                <button
                  v-for="(opt, j) in q.options"
                  :key="j"
                  @click="quizAnswers[i] = j"
                  :class="[
                    'w-full py-3 px-4 rounded-xl text-left transition',
                    quizAnswers[i] === j
                      ? 'bg-pink-500 text-white'
                      : 'bg-white border border-gray-200 hover:border-pink-300'
                  ]"
                >
                  {{ ['A', 'B', 'C'][j] }}. {{ opt }}
                </button>
              </div>
            </div>
          </div>

          <button
            @click="submitQuiz"
            :disabled="quizAnswers.some(a => a === -1)"
            :class="[
              'w-full mt-6 py-4 rounded-xl font-medium transition text-lg',
              quizAnswers.every(a => a !== -1)
                ? 'bg-pink-500 text-white hover:bg-pink-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            ]"
          >
            提交答案
          </button>
        </div>
      </div>

      <!-- 结果页 -->
      <div v-else-if="currentView === 'result'" class="space-y-4">
        <!-- 匹配成功 -->
        <div v-if="todayMatch?.matched?.length >= 2" class="bg-white rounded-2xl p-6 shadow-sm">
          <div class="text-center mb-4">
            <div class="text-5xl mb-2">🎊</div>
            <h2 class="text-lg font-bold text-gray-800">匹配成功！</h2>
          </div>

          <div class="flex items-center justify-center gap-4 mb-4">
            <div class="text-center">
              <div class="text-4xl mb-1">{{ todayMatch.matched[0]?.avatar }}</div>
              <div class="text-sm text-gray-600">{{ todayMatch.matched[0]?.name }}</div>
              <div class="text-xs text-gray-400">{{ todayMatch.matched[0]?.gender === 'male' ? '👦 男生' : '👧 女生' }}</div>
            </div>
            <div class="text-2xl text-pink-400">💕</div>
            <div class="text-center">
              <div class="text-4xl mb-1">{{ todayMatch.matched[1]?.avatar }}</div>
              <div class="text-sm text-gray-600">{{ todayMatch.matched[1]?.name }}</div>
              <div class="text-xs text-gray-400">{{ todayMatch.matched[1]?.gender === 'male' ? '👦 男生' : '👧 女生' }}</div>
            </div>
          </div>

          <div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 text-center">
            <p class="mb-1">📍 公司餐厅</p>
            <p>🕐 今晚 18:30</p>
          </div>
        </div>

        <!-- 等待匹配 -->
        <div v-else class="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div class="text-5xl mb-4">⏳</div>
          <h2 class="text-lg font-bold text-gray-800 mb-2">等待匹配中...</h2>
          <p class="text-gray-500 text-sm">
            {{ isCreator ? '等待Ta来答题' : '等待其他人' }}
          </p>
        </div>

        <button
          @click="loadTodayMatch"
          class="w-full py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition"
        >
          🔄 刷新查看结果
        </button>
      </div>
    </div>
  </div>
</template>
