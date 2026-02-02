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
        const batch = writeBatch(db);
        const studentCodes = [];

        for (let i = 1; i <= studentCount; i++) {
            let code = generateNumericCode();
            // 중복 체크는 생략 (확률적으로 매우 낮음)

            const codeRef = doc(collection(db, 'studentCodes'));
            batch.set(codeRef, {
                code,
                classId: classRef.id,
                studentNumber: i,
                createdAt: serverTimestamp()
            });

            studentCodes.push({ studentNumber: i, code });
        }

        await batch.commit();

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
        // 관련 학생 코드 삭제
        const codesQuery = query(collection(db, 'studentCodes'), where('classId', '==', classId));
        const codesSnapshot = await getDocs(codesQuery);
        const batch = writeBatch(db);
        codesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // 관련 시험 삭제
        const examsQuery = query(collection(db, 'exams'), where('classId', '==', classId));
        const examsSnapshot = await getDocs(examsQuery);
        examsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // 관련 제출 삭제
        const submissionsQuery = query(collection(db, 'submissions'), where('classId', '==', classId));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        submissionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // 학급 삭제
        batch.delete(doc(db, 'classes', classId));
        await batch.commit();

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
                isMultipleAnswer: q.isMultipleAnswer || false
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
                isMultipleAnswer: q.isMultipleAnswer || false
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
        // 관련 제출 삭제
        const submissionsQuery = query(collection(db, 'submissions'), where('examId', '==', examId));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const batch = writeBatch(db);
        submissionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // 정답 문서 삭제
        batch.delete(doc(db, 'examAnswers', examId));

        // 시험 삭제
        batch.delete(doc(db, 'exams', examId));
        await batch.commit();
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
                correctAnswer: question.correctAnswers,
                studentAnswer: studentAnswer?.value ?? studentAnswer,
                correct: isCorrect,
                points: earnedPoints,
                maxPoints: question.points
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
        case 'ox':
            return correctAnswers[0] === studentAnswer;
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
    const student = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];

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
        batch.update(submissionRef, {
            score: gradeResult.autoScore,
            correctCount: gradeResult.correctCount,
            autoScore: gradeResult.autoScore,
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

export { db, auth };

