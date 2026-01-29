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
 */
export const createExam = async (classId, examData) => {
    try {
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
        return { data: { id: examRef.id }, error: null };
    } catch (error) {
        return { data: null, error: error.message };
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
 * 시험 삭제
 */
export const deleteExam = async (examId) => {
    try {
        // 관련 제출 삭제
        const submissionsQuery = query(collection(db, 'submissions'), where('examId', '==', examId));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const batch = writeBatch(db);
        submissionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
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

export { db, auth };
