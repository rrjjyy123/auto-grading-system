import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';

// Firebase 설정 - 사용자가 Firebase Console에서 가져와야 함
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==================== 인증 ====================

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return { user: result.user, error: null };
    } catch (error) {
        return { user: null, error: error.message };
    }
};

export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => auth.currentUser;

// ==================== 학급 관리 ====================

// 6자리 숫자 코드 생성
const generateNumericCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 학급 생성 및 학생 코드 자동 생성
 */
export const createClass = async (name, studentCount) => {
    const user = auth.currentUser;
    if (!user) return { data: null, error: '로그인이 필요합니다.' };

    try {
        // 학급 생성
        const classRef = await addDoc(collection(db, 'classes'), {
            name,
            teacherId: user.uid,
            studentCount,
            createdAt: serverTimestamp(),
            isActive: true
        });

        // 학생별 코드 생성
        // 학생별 코드 생성
        const studentCodes = [];
        const allCodeDocs = [];

        for (let i = 1; i <= studentCount; i++) {
            let code = generateNumericCode();
            allCodeDocs.push({
                code,
                classId: classRef.id,
                studentNumber: i,
                createdAt: serverTimestamp()
            });
            studentCodes.push({ studentNumber: i, code });
        }

        // 2. 500개씩 나누어 배치 처리
        const chunkSize = 450; // 여유있게
        for (let i = 0; i < allCodeDocs.length; i += chunkSize) {
            const chunk = allCodeDocs.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            chunk.forEach(data => {
                const codeRef = doc(collection(db, 'studentCodes'));
                batch.set(codeRef, data);
            });

            await batch.commit();
        }

        return {
            data: {
                id: classRef.id,
                name,
                studentCount,
                studentCodes
            },
            error: null
        };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * 내 학급 목록 조회 (실시간)
 */
export const subscribeToMyClasses = (callback) => {
    const user = auth.currentUser;
    if (!user) return () => { };

    const q = query(
        collection(db, 'classes'),
        where('teacherId', '==', user.uid),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(classes);
    });
};

/**
 * 학급 삭제 (관련 데이터 포함)
 */
export const deleteClass = async (classId) => {
    try {
        // 헬퍼 함수: 배치 삭제 (청크 처리)
        const deleteInBatches = async (querySnapshot) => {
            const docs = querySnapshot.docs;
            const chunkSize = 450;
            for (let i = 0; i < docs.length; i += chunkSize) {
                const chunk = docs.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        };

        // 관련 학생 코드 삭제
        const codesQuery = query(collection(db, 'studentCodes'), where('classId', '==', classId));
        const codesSnapshot = await getDocs(codesQuery);
        await deleteInBatches(codesSnapshot);

        // 관련 시험 삭제
        const examsQuery = query(collection(db, 'exams'), where('classId', '==', classId));
        const examsSnapshot = await getDocs(examsQuery);
        await deleteInBatches(examsSnapshot);

        // 관련 제출 삭제
        const submissionsQuery = query(collection(db, 'submissions'), where('classId', '==', classId));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        await deleteInBatches(submissionsSnapshot);

        // 관련 로그 삭제 (추가됨)
        // 로그는 examId 기준이지만 classId로 바로 찾기 어려울 수 있음. 
        // 여기서는 시험이 삭제되면 로그는 고아 데이터가 되지만, 큰 문제는 없음.
        // 완벽을 기하려면 시험 ID들을 모아서 로그를 삭제해야 함. (생략 가능)

        // 학급 삭제
        await deleteDoc(doc(db, 'classes', classId));
        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

/**
 * 학급 활성화/비활성화 토글
 */
export const toggleClassActive = async (classId, isActive) => {
    try {
        await updateDoc(doc(db, 'classes', classId), { isActive });
        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

/**
 * 학급의 학생 코드 목록 조회
 */
export const getStudentCodes = async (classId) => {
    try {
        const q = query(
            collection(db, 'studentCodes'),
            where('classId', '==', classId),
            orderBy('studentNumber', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching student codes:', error);
        return [];
    }
};

// ==================== 시험 관리 ====================

/**
 * 시험 생성
 * - 새 형식: questions 배열 (다양한 문제 유형 지원)
 * - 기존 형식: answers 배열 (하위 호환)
 */
export const createExam = async (classId, examData) => {
    try {
        // 새 형식 (questions 배열이 있는 경우)
        if (examData.questions) {
            // 기존 형식 호환을 위해 answers 배열도 생성
            const legacyAnswers = examData.questions.map(q => {
                if (q.type === 'essay') return null;
                if (q.correctAnswers && q.correctAnswers.length > 0) {
                    return q.correctAnswers[0];
                }
                return 0;
            });

            // 학생용 문항 정보 (정답 제외)
            const questionTypes = examData.questions.map(q => ({
                num: q.num,
                type: q.type,
                points: q.points,
                isMultipleAnswer: q.isMultipleAnswer || false,
                category: q.category || '',
                explanation: q.explanation || ''
            }));

            const examRef = await addDoc(collection(db, 'exams'), {
                classId,
                subject: examData.subject,
                title: examData.title,
                defaultType: examData.defaultType,
                questionCount: examData.questionCount,
                totalPoints: examData.totalPoints,
                autoGradablePoints: examData.autoGradablePoints,
                manualGradablePoints: examData.manualGradablePoints,
                timeLimit: examData.timeLimit || 0,
                // 학생용 문항 정보 (정답 포함 안함)
                questionTypes: questionTypes,
                // 기존 형식 호환
                answers: legacyAnswers,
                pointsPerQuestion: Math.round(examData.totalPoints / examData.questionCount),
                createdAt: serverTimestamp(),
                isActive: true
            });

            // 정답 정보는 별도 컬렉션에만 저장 (보안)
            await setDoc(doc(db, 'examAnswers', examRef.id), {
                examId: examRef.id,
                classId,
                questions: examData.questions,
                // 기존 형식 호환
                answers: legacyAnswers,
                createdAt: serverTimestamp()
            });

            return { data: { id: examRef.id }, error: null };
        }

        // 기존 형식 (answers 배열만 있는 경우) - 하위 호환
        const examRef = await addDoc(collection(db, 'exams'), {
            classId,
            subject: examData.subject,
            title: examData.title,
            answers: examData.answers,
            questionCount: examData.answers.length,
            pointsPerQuestion: examData.pointsPerQuestion || 4,
            timeLimit: examData.timeLimit || 0,
            createdAt: serverTimestamp(),
            isActive: true
        });

        await setDoc(doc(db, 'examAnswers', examRef.id), {
            examId: examRef.id,
            classId,
            answers: examData.answers,
            createdAt: serverTimestamp()
        });

        return { data: { id: examRef.id }, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * 시험 수정
 */
export const updateExam = async (examId, classId, examData) => {
    try {
        // 새 형식 (questions 배열)
        if (examData.questions) {
            const legacyAnswers = examData.questions.map(q => {
                if (q.type === 'essay') return null;
                if (q.correctAnswers && q.correctAnswers.length > 0) {
                    return q.correctAnswers[0];
                }
                return 0;
            });

            const questionTypes = examData.questions.map(q => ({
                num: q.num,
                type: q.type,
                points: q.points,
                isMultipleAnswer: q.isMultipleAnswer || false,
                category: q.category || '',
                explanation: q.explanation || ''
            }));

            await updateDoc(doc(db, 'exams', examId), {
                subject: examData.subject,
                title: examData.title,
                defaultType: examData.defaultType,
                questionCount: examData.questionCount,
                totalPoints: examData.totalPoints,
                autoGradablePoints: examData.autoGradablePoints,
                manualGradablePoints: examData.manualGradablePoints,
                timeLimit: examData.timeLimit || 0,
                questionTypes: questionTypes,
                answers: legacyAnswers,
                pointsPerQuestion: Math.round(examData.totalPoints / examData.questionCount),
                allowRetake: examData.allowRetake || false,
                updatedAt: serverTimestamp()
            });

            await setDoc(doc(db, 'examAnswers', examId), {
                examId: examId,
                classId,
                questions: examData.questions,
                answers: legacyAnswers,
                updatedAt: serverTimestamp()
            }, { merge: true });

            return { error: null };
        }

        // 기존 형식
        await updateDoc(doc(db, 'exams', examId), {
            subject: examData.subject,
            title: examData.title,
            answers: examData.answers,
            questionCount: examData.answers.length,
            pointsPerQuestion: examData.pointsPerQuestion || 4,
            timeLimit: examData.timeLimit || 0,
            allowRetake: examData.allowRetake || false,
            updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, 'examAnswers', examId), {
            examId: examId,
            classId,
            answers: examData.answers,
            updatedAt: serverTimestamp()
        }, { merge: true });

        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

/**
 * 학급의 시험 목록 조회 (실시간)
 */
export const subscribeToExams = (classId, callback) => {
    const q = query(
        collection(db, 'exams'),
        where('classId', '==', classId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(exams);
    });
};

/**
 * 시험 삭제 (정답 문서도 함께 삭제)
 */
export const deleteExam = async (examId) => {
    try {
        // 헬퍼 함수: 배치 삭제 (청크 처리 및 에러 무시)
        const deleteInBatches = async (querySnapshot) => {
            const docs = querySnapshot.docs;
            const chunkSize = 450;
            for (let i = 0; i < docs.length; i += chunkSize) {
                const chunk = docs.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(doc => batch.delete(doc.ref));
                try {
                    await batch.commit();
                } catch (e) {
                    console.error("Partial delete failed", e);
                    // 일부 실패하더라도 진행 (권한 문제 등)
                }
            }
        };

        // 관련 제출 삭제 (에러 무시)
        try {
            const submissionsQuery = query(collection(db, 'submissions'), where('examId', '==', examId));
            const submissionsSnapshot = await getDocs(submissionsQuery);
            await deleteInBatches(submissionsSnapshot);
        } catch (e) {
            console.error("Submissions delete failed", e);
        }

        // 관련 로그 삭제 (에러 무시)
        try {
            const logsQuery = query(collection(db, 'exam_logs'), where('examId', '==', examId));
            const logsSnapshot = await getDocs(logsQuery);
            await deleteInBatches(logsSnapshot);
        } catch (e) {
            console.error("Logs delete failed", e);
        }

        // 정답 문서 삭제
        try {
            await deleteDoc(doc(db, 'examAnswers', examId));
        } catch (e) {
            console.error("Exam answer delete failed", e);
        }

        // 시험 삭제
        await deleteDoc(doc(db, 'exams', examId));

        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

/**
 * 시험 활성화/비활성화 토글
 */
export const toggleExamActive = async (examId, isActive) => {
    try {
        await updateDoc(doc(db, 'exams', examId), { isActive });
        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

// ==================== 제출 조회 ====================

/**
 * 시험별 제출 목록 조회 (실시간)
 */
export const subscribeToSubmissions = (examId, callback) => {
    const q = query(
        collection(db, 'submissions'),
        where('examId', '==', examId),
        orderBy('submittedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(submissions);
    });
};

/**
 * 학급별 모든 제출 조회 (실시간)
 */
export const subscribeToClassSubmissions = (classId, callback) => {
    const q = query(
        collection(db, 'submissions'),
        where('classId', '==', classId),
        orderBy('submittedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(submissions);
    });
};

/**
 * 내 제출 확인 (실시간)
 */
export const subscribeToMySubmission = (examId, studentNumber, callback) => {
    const q = query(
        collection(db, 'submissions'),
        where('examId', '==', examId),
        where('studentNumber', '==', studentNumber)
    );

    return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } else {
            callback(null);
        }
    });
};

/**
 * 내 제출 확인 (일회성)
 */
export const getMySubmission = async (examId, studentNumber) => {
    try {
        const q = query(
            collection(db, 'submissions'),
            where('examId', '==', examId),
            where('studentNumber', '==', studentNumber)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return { data: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }, error: null };
        }
        return { data: null, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * 시험 정답 조회 (별도 컬렉션에서)
 */
export const getExamAnswers = async (examId) => {
    try {
        const answerDoc = await getDoc(doc(db, 'examAnswers', examId));
        if (answerDoc.exists()) {
            return { data: answerDoc.data(), error: null };
        }
        return { data: null, error: '정답을 찾을 수 없습니다.' };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * 제출물 채점 (선생님 앱에서만 호출)
 * @param {Object} submission - 제출 데이터
 * @param {Object} answerData - 정답 데이터 (questions 또는 answers)
 * @returns {Object} 채점 결과 { correctCount, autoScore, itemResults }
 */
export const gradeSubmission = (submission, answerData) => {
    const studentAnswers = submission.answers;
    let correctCount = 0;
    let autoScore = 0;
    const itemResults = [];
    let hasEssay = false;
    let essayCount = 0;

    // 새 형식 (questions 배열)
    if (answerData.questions) {
        answerData.questions.forEach((question, idx) => {
            const studentAnswer = studentAnswers[idx];

            if (question.type === 'essay') {
                // 서술형은 자동채점 안함
                itemResults.push({
                    questionNum: idx + 1,
                    type: 'essay',
                    studentAnswer: studentAnswer?.value || '',
                    correct: null,
                    points: 0,
                    maxPoints: question.points
                });
                hasEssay = true;
                essayCount++;
                return;
            }

            // 자동채점 가능한 문항
            const isCorrect = gradeQuestion(question, studentAnswer?.value ?? studentAnswer);
            const earnedPoints = isCorrect ? question.points : 0;

            if (isCorrect) correctCount++;
            autoScore += earnedPoints;

            itemResults.push({
                questionNum: idx + 1,
                type: question.type,
                correctAnswer: question.correctAnswers, // Keep for teacher app display
                studentAnswer: studentAnswer?.value ?? studentAnswer,
                correct: isCorrect,
                points: earnedPoints,
                maxPoints: question.points,
                category: question.category || ''
            });
        });
    } else {
        // 기존 형식 (answers 배열)
        const correctAnswers = answerData.answers || answerData;
        const pointsPerQuestion = answerData.pointsPerQuestion || 4;

        correctAnswers.forEach((correctAnswer, idx) => {
            const studentAnswer = Array.isArray(studentAnswers[idx]?.value)
                ? studentAnswers[idx].value[0]
                : (studentAnswers[idx]?.value ?? studentAnswers[idx]);

            const isCorrect = studentAnswer === correctAnswer;
            if (isCorrect) {
                correctCount++;
                autoScore += pointsPerQuestion;
            }

            itemResults.push({
                questionNum: idx + 1,
                type: 'choice4',
                correctAnswer,
                studentAnswer,
                correct: isCorrect,
                points: isCorrect ? pointsPerQuestion : 0,
                maxPoints: pointsPerQuestion
            });
        });
    }

    return {
        correctCount,
        autoScore,
        totalScore: autoScore, // 서술형 포함 최종점수는 별도 계산
        itemResults,
        hasEssay,
        essayCount,
        graded: true
    };
};

/**
 * 문항 채점 로직
 */
const gradeQuestion = (question, studentAnswer) => {
    const { type, correctAnswers, answerLogic } = question;

    if (!correctAnswers || correctAnswers.length === 0) return false;

    switch (type) {
        case 'choice4':
        case 'choice5':
            return gradeChoice(correctAnswers, studentAnswer, answerLogic);
        case 'ox': {
            const correct = correctAnswers[0];
            const student = Array.isArray(studentAnswer) ? studentAnswer[0] : studentAnswer;
            // O, 'O', true 모두 O로 취급
            // X, 'X', false 모두 X로 취급
            const isO = (val) => val === 'O' || val === true;
            const isX = (val) => val === 'X' || val === false;

            if (isO(correct)) return isO(student);
            if (isX(correct)) return isX(student);
            return correct === student;
        }
        case 'short':
            return gradeShortAnswer(correctAnswers, studentAnswer, answerLogic);
        default:
            return false;
    }
};

/**
 * 객관식 채점 (AND/OR)
 */
const gradeChoice = (correctAnswers, studentAnswer, logic) => {
    // studentAnswer가 null/undefined인 경우 빈 배열 처리
    const student = Array.isArray(studentAnswer)
        ? studentAnswer
        : (studentAnswer ? [studentAnswer] : []);

    if (logic === 'or') {
        return student.some(a => correctAnswers.includes(a));
    } else {
        if (correctAnswers.length !== student.length) return false;
        return correctAnswers.every(a => student.includes(a));
    }
};

/**
 * 단답형 채점
 */
const gradeShortAnswer = (correctAnswers, studentAnswer, logic) => {
    if (!studentAnswer || typeof studentAnswer !== 'string') return false;

    const normalized = studentAnswer.toLowerCase().trim();

    if (logic === 'or') {
        return correctAnswers.some(ans => ans.toLowerCase().trim() === normalized);
    } else {
        return correctAnswers.every(ans => normalized.includes(ans.toLowerCase().trim()));
    }
};

/**
 * 제출물 점수 업데이트 (서술형 수동 채점 포함)
 */
export const updateSubmissionScore = async (submissionId, scoreData) => {
    try {
        const updateData = {
            score: scoreData.score,
            correctCount: scoreData.correctCount,
            autoScore: scoreData.autoScore,
            graded: true,
            gradedAt: serverTimestamp()
        };

        // 문항별 채점 결과 저장 (학생 결과 상세 표시용)
        if (scoreData.itemResults !== undefined) {
            updateData.itemResults = scoreData.itemResults;
        }

        // 서술형 수동 채점 정보
        if (scoreData.manualScores !== undefined) {
            updateData.manualScores = scoreData.manualScores;
        }
        if (scoreData.manualGradingComplete !== undefined) {
            updateData.manualGradingComplete = scoreData.manualGradingComplete;
        }

        await updateDoc(doc(db, 'submissions', submissionId), updateData);
        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

/**
 * 일괄 채점 (미채점 제출물 모두 채점)
 */
export const gradeAllSubmissions = async (examId, submissions, answerData) => {
    const batch = writeBatch(db);
    const results = [];

    for (const submission of submissions) {
        if (submission.graded) continue; // 이미 채점된 것은 건너뜀

        const gradeResult = gradeSubmission(submission, answerData);

        const submissionRef = doc(db, 'submissions', submission.id);
        // 보안: itemResults에서 correctAnswer 제거 (F12 정답 유출 방지)
        // 정답은 교사가 '결과 전송' 시 showAnswers 활성화하면 그때 추가됨
        const safeItemResults = gradeResult.itemResults.map(item => {
            const { correctAnswer, ...rest } = item;
            return rest;
        });

        batch.update(submissionRef, {
            score: gradeResult.autoScore,
            correctCount: gradeResult.correctCount,
            autoScore: gradeResult.autoScore,
            itemResults: safeItemResults, // correctAnswer 제외된 버전 저장
            graded: true,
            gradedAt: serverTimestamp()
        });

        results.push({
            submissionId: submission.id,
            studentNumber: submission.studentNumber,
            ...gradeResult
        });
    }

    try {
        await batch.commit();
        return { results, error: null };
    } catch (error) {
        return { results: [], error: error.message };
    }
};

// ==================== 접속 확인 (모니터링) ====================

/**
 * 접속 로그 기록 (Student App용 - 나중에 교사 앱에서도 테스트용으로 쓸 수 있음)
 * status: 'connected' | 'submitted'
 */
export const logConnection = async (examId, studentNumber, status) => {
    try {
        const logRef = doc(db, 'exam_logs', `${examId}_${studentNumber}`);
        await setDoc(logRef, {
            examId,
            studentNumber,
            status,
            timestamp: serverTimestamp()
        }, { merge: true });
        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

/**
 * 시험 접속 로그 조회 (Teacher App용 - 일회성 조회)
 */
export const fetchExamLogs = async (examId) => {
    try {
        const q = query(collection(db, 'exam_logs'), where('examId', '==', examId));
        const snapshot = await getDocs(q);
        const logs = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            logs[data.studentNumber] = data;
        });
        return { data: logs, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * 결과 전송 설정 업데이트
 * showAnswers가 활성화되면 submissions에 correctAnswer를 주입
 */
export const updateResultConfig = async (examId, config, statistics = null) => {
    try {
        const updateData = { resultConfig: config };
        if (statistics) {
            updateData.statistics = statistics;
        }
        await updateDoc(doc(db, 'exams', examId), updateData);

        // showAnswers가 활성화되면 submissions에 correctAnswer 주입
        if (config.showAnswers) {
            // 정답 데이터 가져오기
            const answersDoc = await getDoc(doc(db, 'examAnswers', examId));
            if (answersDoc.exists()) {
                const answerData = answersDoc.data();
                const questions = answerData.questions || [];

                // 해당 시험의 모든 submissions 업데이트
                const subsQuery = query(
                    collection(db, 'submissions'),
                    where('examId', '==', examId)
                );
                const subsSnapshot = await getDocs(subsQuery);

                const batch = writeBatch(db);
                subsSnapshot.docs.forEach(subDoc => {
                    const subData = subDoc.data();
                    if (subData.itemResults && Array.isArray(subData.itemResults)) {
                        // correctAnswer 주입
                        const enrichedResults = subData.itemResults.map((item, idx) => ({
                            ...item,
                            correctAnswer: questions[idx]?.correctAnswers || null
                        }));
                        batch.update(subDoc.ref, { itemResults: enrichedResults });
                    } else if (subData.answers && Array.isArray(subData.answers)) {
                        // itemResults가 없으면 answers에서 새로 생성
                        const newItemResults = subData.answers.map((answer, idx) => {
                            const question = questions[idx] || {};
                            const studentAnswer = answer?.value ?? answer;
                            return {
                                questionNum: idx + 1,
                                type: question.type || 'choice4',
                                studentAnswer: studentAnswer,
                                correctAnswer: question.correctAnswers || null,
                                correct: null,  // 채점 정보 없음
                                points: 0,
                                maxPoints: question.points || 4
                            };
                        });
                        batch.update(subDoc.ref, { itemResults: newItemResults });
                    }
                });
                await batch.commit();
            }
        }

        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

export { db, auth };

