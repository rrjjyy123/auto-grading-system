// 클라이언트용 Gemini 모듈 (API 프록시 사용)
// 프롬프트는 서버(/api/chat)에만 존재하여 클라이언트에서 볼 수 없음

let chatHistory = [];
let participants = [];

// 재시도 설정 및 유틸리티
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (fetchFn, maxRetries = MAX_RETRIES) => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fetchFn();
        } catch (error) {
            lastError = error;
            const isOverloaded = error.message?.includes('503') ||
                error.message?.includes('overloaded') ||
                error.message?.includes('RESOURCE_EXHAUSTED');

            if (isOverloaded && attempt < maxRetries - 1) {
                const delayTime = INITIAL_DELAY_MS * Math.pow(2, attempt);
                console.log(`API 과부하 - ${delayTime}ms 후 재시도 (${attempt + 1}/${maxRetries})`);
                await delay(delayTime);
            } else {
                throw error;
            }
        }
    }
    throw lastError;
};

export const initializeGemini = () => {
    // API 프록시 사용으로 클라이언트 초기화 불필요
    return true;
};

export const startNewChat = (participantList) => {
    participants = participantList;
    chatHistory = [];
    return true;
};

export const sendMessage = async (speaker, message) => {
    return fetchWithRetry(async () => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'message',
                participants,
                speaker,
                message,
                history: chatHistory,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json();

        // 히스토리 업데이트
        chatHistory.push({ type: 'user', speaker, content: message });
        chatHistory.push({ type: 'ai', content: data.response });

        return data.response;
    });
};

// 초기 대화 시작 프롬프트 (서버에도 동일하게 존재)
const INITIAL_PROMPT = `대화 모임이 시작되었습니다. 학생들에게 이미 규칙 안내가 완료되었습니다.

이제 따뜻하게 인사하고, "무슨 일이 있었는지 편하게 이야기해줄래?" 라고 질문하며 대화를 시작하세요.
짧고 친근하게 시작해주세요.`;

export const getInitialMessage = async () => {
    return fetchWithRetry(async () => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'start',
                participants,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data = await response.json();

        // 히스토리에 초기 프롬프트(user)와 AI 응답(model) 순서로 추가
        // Gemini API는 첫 메시지가 'user' 역할이어야 함
        chatHistory.push({ type: 'user', speaker: 'system', content: INITIAL_PROMPT });
        chatHistory.push({ type: 'ai', content: data.response });

        return data.response;
    });
};

/**
 * 대화 내용을 요약하는 함수
 */
export const generateSummary = async (messages, participantList) => {
    try {
        return await fetchWithRetry(async () => {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'summary',
                    messages,
                    participants: participantList,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }

            const data = await response.json();
            return data.summary;
        });
    } catch (error) {
        console.error('Error generating summary:', error);
        return null;
    }
};
