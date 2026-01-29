import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

export const initializeSupabase = () => {
    if (supabase) {
        return supabase;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Supabase credentials not set.');
        return null;
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
};

export const getSupabase = () => supabase;

export const isSupabaseEnabled = () => {
    return supabase !== null;
};

// ==================== 인증 관련 ====================

/**
 * Google 로그인
 */
export const signInWithGoogle = async () => {
    if (!supabase) return { error: 'Supabase not initialized' };

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });

    return { data, error };
};

/**
 * 로그아웃
 */
export const signOut = async () => {
    if (!supabase) return { error: 'Supabase not initialized' };
    return await supabase.auth.signOut();
};

/**
 * 현재 사용자 가져오기
 */
export const getCurrentUser = async () => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

/**
 * 인증 상태 변화 리스너
 */
export const onAuthStateChange = (callback) => {
    if (!supabase) return () => { };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
};

// ==================== 세션 관리 ====================

/**
 * 6자리 랜덤 세션 코드 생성
 */
const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * 새 세션 생성
 */
export const createSession = async (name = '') => {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };

    const user = await getCurrentUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    // 고유한 코드 생성 (중복 시 재시도)
    let code = generateSessionCode();
    let attempts = 0;

    while (attempts < 5) {
        const { data, error } = await supabase
            .from('sessions')
            .insert({
                teacher_id: user.id,
                code: code,
                name: name || `세션 ${new Date().toLocaleDateString('ko-KR')}`
            })
            .select()
            .single();

        if (!error) {
            return { data, error: null };
        }

        if (error.code === '23505') { // unique constraint violation
            code = generateSessionCode();
            attempts++;
        } else {
            return { data: null, error: error.message };
        }
    }

    return { data: null, error: '세션 코드 생성에 실패했습니다.' };
};

/**
 * 내 세션 목록 가져오기
 */
export const getMySessions = async () => {
    if (!supabase) return [];

    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching sessions:', error);
        return [];
    }

    return data || [];
};

/**
 * 세션 비활성화/활성화 토글
 */
export const toggleSessionActive = async (sessionId, isActive) => {
    if (!supabase) return { error: 'Supabase not initialized' };

    const { data, error } = await supabase
        .from('sessions')
        .update({ is_active: isActive })
        .eq('id', sessionId)
        .select()
        .single();

    return { data, error };
};

/**
 * 세션 삭제 (관련 대화 기록도 함께 삭제)
 */
export const deleteSession = async (sessionId) => {
    if (!supabase) return { error: 'Supabase not initialized' };

    // 먼저 세션 코드를 조회
    const { data: session, error: fetchError } = await supabase
        .from('sessions')
        .select('code')
        .eq('id', sessionId)
        .single();

    if (fetchError) {
        return { error: fetchError.message };
    }

    // 해당 세션 코드와 연결된 모든 대화 삭제
    if (session?.code) {
        const { error: conversationsError } = await supabase
            .from('conversations')
            .delete()
            .eq('session_code', session.code);

        if (conversationsError) {
            console.error('Error deleting conversations:', conversationsError);
            // 대화 삭제 실패해도 세션 삭제는 진행
        }
    }

    // 세션 삭제
    const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

    return { error };
};

// ==================== 대화 기록 조회 ====================

/**
 * 특정 세션의 대화 목록 가져오기
 */
export const getConversationsBySession = async (sessionCode) => {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_code', sessionCode)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching conversations:', error);
        return [];
    }

    return data || [];
};

/**
 * 대화 상세 조회
 */
export const getConversationById = async (id) => {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching conversation:', error);
        return null;
    }

    return data;
};

/**
 * 대화 삭제
 */
export const deleteConversation = async (id) => {
    if (!supabase) return false;

    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

    return !error;
};

/**
 * 대화 메모 업데이트
 */
export const updateMemo = async (id, memo) => {
    if (!supabase) return { data: null, error: 'Supabase not initialized' };

    const { data, error } = await supabase
        .from('conversations')
        .update({ memo })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
};
