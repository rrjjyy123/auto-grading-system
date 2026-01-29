import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
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
 * 답안 제출
 */
export const submitAnswers = async (examId, classId, studentNumber, studentCode, answers) => {
    try {
        // 시험 정보 가져오기 (채점용)
        const examDoc = await getDoc(doc(db, 'exams', examId));
        if (!examDoc.exists()) {
            return { success: false, error: '시험을 찾을 수 없습니다.' };
        }
        const examData = examDoc.data();

        // 채점
        let correctCount = 0;
        answers.forEach((answer, idx) => {
            if (answer === examData.answers[idx]) {
                correctCount++;
            }
        });
        const score = correctCount * examData.pointsPerQuestion;

        // 제출 저장
        await addDoc(collection(db, 'submissions'), {
            examId,
            classId,
            studentNumber,
            studentCode,
            answers,
            correctCount,
            score,
            submittedAt: serverTimestamp()
        });

        return {
            success: true,
            score,
            correctCount,
            totalQuestions: examData.questionCount,
            error: null
        };
    } catch (error) {
        console.error('Error submitting answers:', error);
        return { success: false, error: '제출 중 오류가 발생했습니다.' };
    }
};

export { db };
