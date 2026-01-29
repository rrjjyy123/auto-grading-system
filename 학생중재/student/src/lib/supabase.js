import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

export const initializeSupabase = () => {
    if (supabase) {
        return true;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Supabase credentials not set. Conversation saving will be disabled.');
        return false;
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
};

export const isSupabaseEnabled = () => {
    return supabase !== null;
};

/**
 * 세션 코드 유효성 검증
 * @param {string} code - 세션 코드
 * @returns {Promise<{valid: boolean, session: object|null, error: string|null}>}
 */
export const validateSessionCode = async (code) => {
    if (!supabase) {
        return { valid: false, session: null, error: 'Supabase가 초기화되지 않았습니다.' };
    }

    try {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { valid: false, session: null, error: '유효하지 않거나 비활성화된 세션 코드입니다.' };
            }
            throw error;
        }

        return { valid: true, session: data, error: null };
    } catch (error) {
        console.error('Error validating session code:', error);
        return { valid: false, session: null, error: '세션 코드 확인 중 오류가 발생했습니다.' };
    }
};

/**
 * 대화 세션 시작 - 새 대화 레코드 생성 (session_code 포함)
 */
export const createConversation = async (participants, sessionCode = null) => {
    if (!supabase) return null;

    try {
        const insertData = {
            participants,
            messages: [],
            status: 'active'
        };

        if (sessionCode) {
            insertData.session_code = sessionCode.toUpperCase();
        }

        const { data, error } = await supabase
            .from('conversations')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating conversation:', error);
        return null;
    }
};

/**
 * 대화 저장/업데이트
 */
export const saveConversation = async (id, messages, summary = null, status = 'active', resolution = null) => {
    if (!supabase) return null;

    try {
        const updateData = {
            messages,
            status
        };

        if (summary) {
            updateData.summary = summary;
        }

        if (resolution) {
            updateData.resolution = resolution;
        }

        if (status === 'completed') {
            updateData.ended_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('conversations')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving conversation:', error);
        return null;
    }
};
