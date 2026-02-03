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
      // LocalStorage 확인
      const savedData = localStorage.getItem('studentData')
      if (savedData && !studentData) {
        try {
          const parsed = JSON.parse(savedData)
          // 유효성 검증 로직을 거치거나 바로 설정
          setStudentData(parsed)
          setScreen('subject')
        } catch (e) {
          localStorage.removeItem('studentData')
        }
      }
    }
  }, [])

  const handleCodeValidated = (data) => {
    localStorage.setItem('studentData', JSON.stringify(data))
    setStudentData(data)
    setScreen('subject')
  }

  const handleExamSelected = async (exam) => {
    // 결과 확인 모드로 진입한 경우
    if (exam.isResultCheck && exam.submission) {
      setResult({
        success: true,
        examId: exam.id,
        studentNumber: exam.submission.studentNumber,
        examTitle: exam.title,
        subject: exam.subject,
        totalQuestions: exam.questionCount,
        hasEssay: exam.submission.hasEssay || false,
        essayCount: exam.submission.essayCount || 0
      })
      setScreen('complete')
      return;
    }

    setLoading(true)

    // 문항 정보 가져오기
    const { data: questionData, error } = await getExamQuestions(exam.id)

    if (questionData && questionData.questions) {
      // 새 형식 - questions 정보 포함
      // 여기서 questions에는 정답 정보가 포함되어 있지 않으므로 안전함 (firebase getExamQuestions 확인 필요: questionTypes만 반환함)
      setSelectedExam({ ...exam, questions: questionData.questions })
    } else {
      // 기존 형식 또는 에러 시 원래 exam 데이터 사용
      setSelectedExam(exam)
    }

    setLoading(false)

    const studentNum = exam.submission?.studentNumber || studentData.studentCode.studentNumber;

    // 이미 제출한 내역이 있는지 확인 (중복 체크)
    // pass exam.submission if available to skip fetching
    let existingSubmission = exam.submission;

    if (!existingSubmission) {
      const { data: sub } = await import('./lib/firebase').then(m => m.getMySubmission(exam.id, studentNum));
      existingSubmission = sub;
    }

    // 재응시 허용 시
    if (exam.allowRetake) {
      setScreen('answer')
      return
    }

    if (existingSubmission) {
      setResult({
        success: true,
        examId: exam.id,
        studentNumber: existingSubmission.studentNumber,
        examTitle: exam.title,
        subject: exam.subject,
        totalQuestions: exam.questionCount,
        hasEssay: existingSubmission.hasEssay || false,
        essayCount: existingSubmission.essayCount || 0
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
    // 처음으로 돌아가기(목록으로)
    setScreen('subject')
    setSelectedExam(null)
    setResult(null)
    // URL 파라미터 보존 (재장전 시 자동로그인 위해? 아니면 제거?)
    // 보통 목록으로 가면 파라미터 없어도 됨
  }

  const handleLogout = () => {
    localStorage.removeItem('studentData')
    setScreen('code')
    setStudentData(null)
    setSelectedExam(null)
    setResult(null)
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
          onBack={handleLogout}
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
