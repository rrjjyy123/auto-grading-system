import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp
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
const db = getFirestore(app);

/**
 * 학생 코드 검증
 * @param {string} code - 6자리 숫자 코드
 * @returns {Promise<{valid: boolean, data: object|null, error: string|null}>}
 */
export const validateStudentCode = async (code) => {
    try {
        const q = query(
            collection(db, 'studentCodes'),
            where('code', '==', code)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { valid: false, data: null, error: '유효하지 않은 코드입니다.' };
        }

        const studentCodeDoc = snapshot.docs[0];
        const studentCodeData = { id: studentCodeDoc.id, ...studentCodeDoc.data() };

        // 학급 정보 가져오기
        const classDoc = await getDoc(doc(db, 'classes', studentCodeData.classId));
        if (!classDoc.exists()) {
            return { valid: false, data: null, error: '학급을 찾을 수 없습니다.' };
        }

        const classData = { id: classDoc.id, ...classDoc.data() };

        if (!classData.isActive) {
            return { valid: false, data: null, error: '현재 비활성화된 학급입니다.' };
        }

        return {
            valid: true,
            data: {
                studentCode: studentCodeData,
                classData: classData
            },
            error: null
        };
    } catch (error) {
        console.error('Error validating code:', error);
        return { valid: false, data: null, error: '코드 확인 중 오류가 발생했습니다.' };
    }
};

/**
 * 학급의 활성화된 시험 목록 가져오기
 */
export const getActiveExams = async (classId) => {
    try {
        const q = query(
            collection(db, 'exams'),
            where('classId', '==', classId),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching exams:', error);
        return [];
    }
};

/**
 * 학생의 기존 제출 여부 확인
 */
export const checkExistingSubmission = async (examId, studentNumber) => {
    try {
        const q = query(
            collection(db, 'submissions'),
            where('examId', '==', examId),
            where('studentNumber', '==', studentNumber)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking submission:', error);
        return false;
    }
};

/**
 * 내 제출 확인 (일회성) - 데이터 반환
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
 * 내 학급 제출 목록 조회 (일회성)
 */
export const getMyClassSubmissions = async (classId, studentNumber) => {
    try {
        const q = query(
            collection(db, 'submissions'),
            where('classId', '==', classId),
            where('studentNumber', '==', studentNumber)
        );
        const snapshot = await getDocs(q);
        const submissions = {};
        snapshot.forEach(doc => {
            submissions[doc.data().examId] = { id: doc.id, ...doc.data() };
        });
        return { data: submissions, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

/**
 * 시험 문항 정보 가져오기 (exams 컬렉션에서)
 * 
 * 보안 정책: 정답은 examAnswers에 있으며, 학생은 접근 불가
 * exams 컬렉션의 questionTypes만 사용
 */
export const getExamQuestions = async (examId) => {
    try {
        const examDoc = await getDoc(doc(db, 'exams', examId));
        if (!examDoc.exists()) {
            return { data: null, error: '시험을 찾을 수 없습니다.' };
        }

        const data = examDoc.data();

        // 새 형식 (questionTypes가 있는 경우)
        if (data.questionTypes) {
            return {
                data: { questions: data.questionTypes },
                error: null
            };
        }

        // 기존 형식 - 4지선다로 처리
        return { data: null, error: null };
    } catch (error) {
        console.error('Error fetching exam questions:', error);
        return { data: null, error: error.message };
    }
};

/**
 * 답안 제출 (채점 없음 - 보안 강화)
 * 
 * 보안 정책: 
 * - 학생 앱에서는 정답(examAnswers)에 접근하지 않음
 * - 채점은 선생님 앱에서만 수행됨
 */
export const submitAnswers = async (examId, classId, studentNumber, studentCode, answers) => {
    try {
        // 시험 정보 가져오기 (정답 아님, 메타데이터만)
        const examDoc = await getDoc(doc(db, 'exams', examId));
        if (!examDoc.exists()) {
            return { success: false, error: '시험을 찾을 수 없습니다.' };
        }
        const examData = examDoc.data();

        // 서술형 문항 수 계산 (새 형식인 경우)
        let essayCount = 0;
        let hasEssay = false;

        if (Array.isArray(answers) && answers[0]?.type !== undefined) {
            answers.forEach((ans) => {
                if (ans.type === 'essay') {
                    essayCount++;
                    hasEssay = true;
                }
            });
        }

        // 제출 저장 (채점 정보 없이 답안만)
        await addDoc(collection(db, 'submissions'), {
            examId,
            classId,
            studentNumber,
            studentCode,
            answers,
            // 채점 관련 필드 - 선생님이 채점 후 업데이트
            score: null,
            correctCount: null,
            autoScore: null,
            hasEssay,
            essayCount,
            graded: false, // 채점 완료 여부
            manualScores: {},
            manualGradingComplete: false,
            submittedAt: serverTimestamp()
        });

        return {
            success: true,
            submitted: true,
            totalQuestions: examData.questionCount,
            hasEssay,
            essayCount,
            error: null
        };
    } catch (error) {
        console.error('Error submitting answers:', error);
        return { success: false, error: '제출 중 오류가 발생했습니다.' };
    }
};

/**
 * 접속 로그 기록 (Student App)
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
 * 시험 정보 실시간 구독 (결과 전송 감지용)
 */
export const subscribeToExam = (examId, callback) => {
    return onSnapshot(doc(db, 'exams', examId), (docSnapshot) => {
        if (docSnapshot.exists()) {
            callback({ id: docSnapshot.id, ...docSnapshot.data() });
        }
    });
};

/**
 * 내 제출 정보 실시간 구독 (채점 결과 감지용)
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
        }
    });
};

export { db };
