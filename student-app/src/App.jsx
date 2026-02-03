import { useState, useEffect } from 'react'
import CodeEntry from './components/CodeEntry'
import SubjectSelect from './components/SubjectSelect'
import AnswerSheet from './components/AnswerSheet'
import SubmitComplete from './components/SubmitComplete'
import { getExamQuestions } from './lib/firebase'
import './index.css'

function App() {
  const [screen, setScreen] = useState('code') // 'code', 'subject', 'answer', 'complete'
  const [studentData, setStudentData] = useState(null) // { studentCode, classData }
  const [selectedExam, setSelectedExam] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // URL에서 코드 파라미터 확인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codeParam = params.get('code')
    if (codeParam) {
      // CodeEntry 컴포넌트에서 자동으로 처리됨
    }
  }, [])

  const handleCodeValidated = (data) => {
    setStudentData(data)
    setScreen('subject')
  }

  const handleExamSelected = async (exam) => {
    setLoading(true)

    // 문항 정보 가져오기
    const { data, error } = await getExamQuestions(exam.id)

    if (data && data.questions) {
      // 새 형식 - questions 정보 포함
      setSelectedExam({ ...exam, questions: data.questions })
    } else {
      // 기존 형식 또는 에러 시 원래 exam 데이터 사용
      setSelectedExam(exam)
    }

    setLoading(false)
    setLoading(false)

    // 이미 제출한 내역이 있는지 확인
    const { data: existingSubmission } = await import('./lib/firebase').then(m => m.getMySubmission(exam.id, data.studentNumber || studentData.studentCode.studentNumber))

    if (existingSubmission) {
      setResult({
        success: true,
        examId: exam.id,
        studentNumber: existingSubmission.studentNumber,
        examTitle: exam.title,
        subject: exam.subject,
        totalQuestions: exam.questionCount, // or existingSubmission.answers.length
        hasEssay: false, // You might need to derive this
        essayCount: 0     // You might need to derive this
      })
      setScreen('complete')
    } else {
      setScreen('answer')
    }
  }

  const handleSubmitComplete = (submitResult) => {
    setResult(submitResult)
    setScreen('complete')
  }

  const handleRestart = () => {
    setScreen('code')
    setStudentData(null)
    setSelectedExam(null)
    setResult(null)
    // URL 파라미터 제거
    window.history.replaceState({}, '', window.location.pathname)
  }

  return (
    <div className="min-h-screen bg-[#FFF8E7]">
      {screen === 'code' && (
        <CodeEntry onValidated={handleCodeValidated} />
      )}
      {screen === 'subject' && studentData && (
        <SubjectSelect
          studentData={studentData}
          onSelectExam={handleExamSelected}
          onBack={() => setScreen('code')}
        />
      )}
      {screen === 'answer' && studentData && selectedExam && (
        <AnswerSheet
          studentData={studentData}
          examData={selectedExam}
          onSubmit={handleSubmitComplete}
          onBack={() => setScreen('subject')}
        />
      )}
      {screen === 'complete' && result && (
        <SubmitComplete
          result={result}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}

export default App
