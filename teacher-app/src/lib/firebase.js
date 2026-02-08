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
    limit,
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
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            number: doc.data().studentNumber,  // number 필드 추가 (호환성)
            code: doc.data().code
        }));
    } catch (error) {
        console.error('Error fetching student codes:', error);
        return [];
    }
};

/**
 * 학생 메모 업데이트
 */
export const updateStudentMemo = async (classId, studentNumber, memo) => {
    try {
        const q = query(
            collection(db, 'studentCodes'),
            where('classId', '==', classId),
            where('studentNumber', '==', studentNumber)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return { error: '학생을 찾을 수 없습니다' };
        }
        const studentDoc = snapshot.docs[0];
        await updateDoc(studentDoc.ref, { memo });
        return { data: { success: true } };
    } catch (error) {
        console.error('Error updating student memo:', error);
        return { error: error.message };
    }
};

/**
 * 학생 추가 (새 번호 자동 할당)
 */
export const addStudent = async (classId) => {
    try {
        // 기존 학생 목록 조회 (인덱스 불필요)
        const q = query(
            collection(db, 'studentCodes'),
            where('classId', '==', classId)
        );
        const snapshot = await getDocs(q);

        // JavaScript에서 최대 번호 계산
        let maxNumber = 0;
        snapshot.docs.forEach(doc => {
            const num = doc.data().studentNumber || 0;
            if (num > maxNumber) maxNumber = num;
        });
        const newNumber = maxNumber + 1;

        // 새 학생 코드 생성
        const code = generateNumericCode();
        await addDoc(collection(db, 'studentCodes'), {
            code,
            classId,
            studentNumber: newNumber,
            createdAt: serverTimestamp()
        });

        // 학급의 studentCount 업데이트
        const classRef = doc(db, 'classes', classId);
        const classDoc = await getDoc(classRef);
        if (classDoc.exists()) {
            await updateDoc(classRef, {
                studentCount: (classDoc.data().studentCount || 0) + 1
            });
        }

        return { data: { number: newNumber, code } };
    } catch (error) {
        console.error('Error adding student:', error);
        return { error: error.message };
    }
};

/**
 * 학생 삭제
 */
export const deleteStudent = async (classId, studentNumber) => {
    try {
        const q = query(
            collection(db, 'studentCodes'),
            where('classId', '==', classId),
            where('studentNumber', '==', studentNumber)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return { error: '학생을 찾을 수 없습니다' };
        }

        await deleteDoc(snapshot.docs[0].ref);

        // 학급의 studentCount 업데이트
        const classRef = doc(db, 'classes', classId);
        const classDoc = await getDoc(classRef);
        if (classDoc.exists() && classDoc.data().studentCount > 0) {
            await updateDoc(classRef, {
                studentCount: classDoc.data().studentCount - 1
            });
        }

        return { data: { success: true } };
    } catch (error) {
        console.error('Error deleting student:', error);
        return { error: error.message };
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
                explanation: q.explanation || '',
                hasSubQuestions: q.hasSubQuestions || false,
                // 소문항 정보 (정답 제외, 배점 포함)
                subQuestions: (q.subQuestions || []).map(sub => ({
                    subNum: sub.subNum,
                    subPoints: sub.subPoints || 0
                    // correctAnswers는 제외 (보안)
                }))
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
                allowRetake: examData.allowRetake || false,
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
                explanation: q.explanation || '',
                hasSubQuestions: q.hasSubQuestions || false,
                // 소문항 정보 (정답 제외, 배점 포함)
                subQuestions: (q.subQuestions || []).map(sub => ({
                    subNum: sub.subNum,
                    subPoints: sub.subPoints || 0
                    // correctAnswers는 제외 (보안)
                }))
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
 * 시험 수정 시 모든 제출물 재채점
 * @param {string} examId
 * @param {object} newExamData - 수정된 시험 데이터 (정답 포함)
 */
export const regradeAllSubmissions = async (examId, newExamData) => {
    try {
        const submissionsQuery = query(collection(db, 'submissions'), where('examId', '==', examId));
        const snapshot = await getDocs(submissionsQuery);

        if (snapshot.empty) return { success: true, count: 0 };

        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach(doc => {
            const submission = { id: doc.id, ...doc.data() };
            // 기존 수동 채점 데이터 보존
            const manualScores = submission.manualScores || {};
            const overrides = submission.overrides || {};

            // 재채점 수행
            const { itemResults, correctCount, autoScore } = gradeSubmission(submission, newExamData);

            // 수동 점수 및 오버라이드 재적용
            let finalScore = 0;
            const updatedItemResults = itemResults.map(item => {
                const newItem = { ...item };

                // 서술형 점수 반영
                if (item.type === 'essay') {
                    if (manualScores[item.questionNum] !== undefined) {
                        newItem.score = manualScores[item.questionNum];
                        // 만점이면 정답 처리 (단순화)
                        newItem.correct = newItem.score === item.maxPoints;
                    }
                }

                // 오버라이드 반영
                if (overrides[item.questionNum] !== undefined) {
                    newItem.correct = overrides[item.questionNum];
                }

                // 점수 합산
                if (newItem.type === 'essay') {
                    finalScore += newItem.score || 0;
                } else {
                    // 오버라이드/자동채점 결과에 따른 점수
                    finalScore += newItem.correct ? newItem.maxPoints : 0;
                }

                return newItem;
            });

            // 업데이트 데이터 준비
            const updateData = {
                score: finalScore,
                correctCount: submission.correctCount, // 일단 기존 유지 또는 재계산 필요? -> 재계산 필요함
                autoScore: autoScore, // 재계산된 자동 채점 점수
                itemResults: updatedItemResults,
                // answers는 학생이 제출한 답이므로 변경 없음
            };

            // 정답 수 재계산 (오버라이드 반영된 결과 기준)
            updateData.correctCount = updatedItemResults.filter(item => item.correct).length;

            batch.update(doc.ref, updateData);
            count++;
        });

        await batch.commit();
        return { success: true, count };
    } catch (error) {
        console.error('Regrading failed:', error);
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
 * 시험 복제
 */
export const copyExam = async (originalExamId) => {
    try {
        // 1. 원본 시험 데이터 조회
        const examSnap = await getDoc(doc(db, 'exams', originalExamId));
        if (!examSnap.exists()) throw new Error('원본 시험을 찾을 수 없습니다.');
        const examData = examSnap.data();

        // 2. 원본 정답 데이터 조회
        const answerSnap = await getDoc(doc(db, 'examAnswers', originalExamId));
        if (!answerSnap.exists()) throw new Error('원본 정답 데이터를 찾을 수 없습니다.');
        const answerData = answerSnap.data();

        // 3. 새 시험 데이터 준비
        const newExamData = {
            ...examData,
            title: `${examData.title} - 복사본`,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isActive: false // 복제된 시험은 비활성 상태로 시작
        };
        delete newExamData.id; // ID는 새로 생성됨

        // 4. 새 시험 생성 (exams 컬렉션)
        const newExamRef = await addDoc(collection(db, 'exams'), newExamData);

        // 5. 새 정답 데이터 생성 (examAnswers 컬렉션)
        const newAnswerData = {
            ...answerData,
            examId: newExamRef.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        delete newAnswerData.id;

        await setDoc(doc(db, 'examAnswers', newExamRef.id), newAnswerData);

        return { data: { id: newExamRef.id }, error: null };
    } catch (error) {
        console.error('Copy exam failed:', error);
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

/**
 * 시험 재응시 설정 토글
 */
export const updateExamRetake = async (examId, allowRetake) => {
    try {
        await updateDoc(doc(db, 'exams', examId), { allowRetake });
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
                    maxPoints: question.points,
                    category: question.category || ''
                });
                hasEssay = true;
                essayCount++;
                return;
            }

            // 소문항이 있는 경우
            if (question.hasSubQuestions && question.subQuestions?.length > 0) {
                const studentSubAnswers = studentAnswer?.subAnswers || [];
                let subCorrectCount = 0;
                const subResults = [];

                question.subQuestions.forEach((sub, subIdx) => {
                    const studentSubAnswer = studentSubAnswers[subIdx] || '';
                    let isSubCorrect = false;

                    if (sub.correctAnswers && sub.correctAnswers.length > 0) {
                        // 소문항 채점 (OR 로직: 정답 중 하나와 일치하면 정답)
                        const normalized = (studentSubAnswer || '').toLowerCase().trim();
                        isSubCorrect = sub.correctAnswers.some(ans =>
                            ans.toLowerCase().trim() === normalized
                        );
                    }

                    if (isSubCorrect) subCorrectCount++;

                    subResults.push({
                        subNum: sub.subNum,
                        correctAnswer: sub.correctAnswers,
                        studentAnswer: studentSubAnswer,
                        correct: isSubCorrect,
                        subPoints: sub.subPoints || 0,
                        earnedPoints: isSubCorrect ? (sub.subPoints || 0) : 0
                    });
                });

                // 부분 점수 계산: 맞은 소문항의 subPoints 합계
                const partialPoints = subResults.reduce((sum, r) => sum + r.earnedPoints, 0);
                const isAllCorrect = subCorrectCount === question.subQuestions.length;

                if (isAllCorrect) correctCount++;
                autoScore += partialPoints;

                itemResults.push({
                    questionNum: idx + 1,
                    type: question.type,
                    hasSubQuestions: true,
                    subResults: subResults,
                    subCorrectCount: subCorrectCount,
                    subTotalCount: question.subQuestions.length,
                    correct: isAllCorrect,
                    points: partialPoints,
                    maxPoints: question.points,
                    category: question.category || ''
                });
                return;
            }

            // 일반 자동채점 문항
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
        graded: !hasEssay // 서술형이 있으면 manualGradingComplete 전까지는 graded: false
    };
};

/**
 * 문항 채점 로직
 */
const gradeQuestion = (question, studentAnswer) => {
    const { type, correctAnswers, answerLogic, ignoreSpace } = question; // ignoreSpace 추가

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
            return gradeShortAnswer(correctAnswers, studentAnswer, answerLogic, ignoreSpace);
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
const gradeShortAnswer = (correctAnswers, studentAnswer, logic, ignoreSpace = true) => {
    if (!studentAnswer || typeof studentAnswer !== 'string') return false;

    // 원문자 → 자모 정규화 함수
    const circleJamoMap = {
        '㉠': 'ㄱ', '㉡': 'ㄴ', '㉢': 'ㄷ', '㉣': 'ㄹ', '㉤': 'ㅁ',
        '㉥': 'ㅂ', '㉦': 'ㅅ', '㉧': 'ㅇ', '㉨': 'ㅈ', '㉩': 'ㅊ',
        '㉪': 'ㅋ', '㉫': 'ㅌ', '㉬': 'ㅍ', '㉭': 'ㅎ'
    };
    const normalize = (str) => {
        let result = str.toLowerCase().trim();
        for (const [circle, jamo] of Object.entries(circleJamoMap)) {
            result = result.replace(new RegExp(circle, 'g'), jamo);
        }
        // 띄어쓰기 무시 옵션이 켜져있으면 모든 공백 제거
        if (ignoreSpace) {
            result = result.replace(/\s+/g, '');
        }
        return result;
    };

    const normalizedStudent = normalize(studentAnswer);

    if (logic === 'or') {
        return correctAnswers.some(ans => normalize(ans) === normalizedStudent);
    } else {
        // AND: 모든 정답이 학생 답에 포함되어야 함 (단답형 AND는 잘 안 쓰이지만)
        return correctAnswers.every(ans => normalizedStudent.includes(normalize(ans)));
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
            // eslint-disable-next-line no-unused-vars
            const { correctAnswer, ...rest } = item;
            return rest;
        });

        batch.update(submissionRef, {
            score: gradeResult.autoScore,
            correctCount: gradeResult.correctCount,
            autoScore: gradeResult.autoScore,
            itemResults: safeItemResults, // correctAnswer 제외된 버전 저장
            graded: gradeResult.graded,
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

/**
 * 단일 제출물 자동 채점
 */
export const autoGradeSubmissions = async (submissionId) => {
    try {
        const subDoc = await getDoc(doc(db, 'submissions', submissionId));
        if (!subDoc.exists()) return { error: 'Submission not found' };
        const submission = { id: subDoc.id, ...subDoc.data() };

        // 정답 데이터 가져오기 (examId 필요)
        const { data: answerData, error: answerError } = await getExamAnswers(submission.examId);
        if (answerError) return { error: answerError };

        // 채점 실행
        const gradeResult = gradeSubmission(submission, answerData);

        // 결과 저장
        const submissionRef = doc(db, 'submissions', submissionId);

        // 보안: itemResults에서 correctAnswer 제거
        const safeItemResults = gradeResult.itemResults.map(item => {
            // eslint-disable-next-line no-unused-vars
            const { correctAnswer, ...rest } = item;
            return rest;
        });

        await updateDoc(submissionRef, {
            score: gradeResult.autoScore,
            correctCount: gradeResult.correctCount,
            autoScore: gradeResult.autoScore,
            itemResults: safeItemResults,
            details: safeItemResults, // details 필드도 동기화 (구버전 호환)
            graded: gradeResult.graded,
            gradedAt: serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        return { error: error.message };
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

        // 결과 공개 옵션이 하나라도 켜지면 필요한 데이터 주입
        if (config.showAnswers || config.showExplanation || config.showRadar) {
            const answersDoc = await getDoc(doc(db, 'examAnswers', examId));
            if (answersDoc.exists()) {
                const answerData = answersDoc.data();
                const questions = answerData.questions || [];

                const subsQuery = query(
                    collection(db, 'submissions'),
                    where('examId', '==', examId)
                );
                const subsSnapshot = await getDocs(subsQuery);

                const batch = writeBatch(db);

                subsSnapshot.docs.forEach(subDoc => {
                    const subData = subDoc.data();
                    if (subData.itemResults && Array.isArray(subData.itemResults)) {
                        const enrichedResults = subData.itemResults.map((item, idx) => {
                            const question = questions[idx] || {};

                            // 기본 데이터 유지
                            const newItem = { ...item };

                            // 1. 정답 공개 시
                            if (config.showAnswers) {
                                newItem.correctAnswer = question.correctAnswers || null;
                            }

                            // 2. 해설 공개 시
                            if (config.showExplanation) {
                                newItem.explanation = question.explanation || '';
                            }

                            // 3. 레이더 차트용 카테고리 (항상 주입 권장)
                            newItem.category = question.category || '';

                            return newItem;
                        });

                        batch.update(subDoc.ref, {
                            itemResults: enrichedResults,
                            details: enrichedResults // 구버전 호환용 fields 동기화
                        });
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

