import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Keyboard,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import type { MisconceptionQuizItem } from '../types/respiration';

/**
 * Props for the 6-item misconception formative assessment quiz modal.
 */
export interface MisconceptionQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizzes: MisconceptionQuizItem[];
}

function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * Classroom smartboard-friendly modal for the 6-item Grade 8 respiration
 * misconception quiz (OX & fill-in-the-blank), featuring step-by-step progress,
 * immediate causal explanation feedback, running score, and final review screen.
 */
export const MisconceptionQuizModal: React.FC<MisconceptionQuizModalProps> = ({
  isOpen,
  onClose,
  quizzes,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textDraft, setTextDraft] = useState<string>('');
  const [useTextInput, setUseTextInput] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const totalCount = quizzes.length;
  const safeIndex = totalCount > 0 ? Math.min(currentIndex, totalCount - 1) : 0;
  const currentQuiz = totalCount > 0 ? quizzes[safeIndex] : undefined;

  useEffect(() => {
    setTextDraft('');
    setUseTextInput(false);
  }, [safeIndex, isOpen]);

  const score = useMemo(() => {
    return quizzes.reduce((acc, item) => {
      const userAnswer = answers[item.id];
      if (
        userAnswer !== undefined &&
        normalizeAnswer(userAnswer) === normalizeAnswer(item.answer)
      ) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [answers, quizzes]);

  const answeredCount = useMemo(
    () => quizzes.filter((item) => answers[item.id] !== undefined).length,
    [answers, quizzes]
  );

  if (!isOpen) {
    return null;
  }

  const handleRestart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setTextDraft('');
    setUseTextInput(false);
    setShowSummary(false);
  };

  const handleSelectAnswer = (quizId: string, selected: string) => {
    if (answers[quizId] !== undefined) return;
    setAnswers((prev) => ({
      ...prev,
      [quizId]: selected,
    }));
  };

  const handleSubmitTextAnswer = (
    event: React.FormEvent<HTMLFormElement>,
    quizId: string
  ) => {
    event.preventDefault();
    const trimmed = textDraft.trim();
    if (!trimmed) return;
    handleSelectAnswer(quizId, trimmed);
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  const handleNext = () => {
    if (safeIndex < totalCount - 1) {
      setCurrentIndex(safeIndex + 1);
    } else {
      setShowSummary(true);
    }
  };

  const currentUserAnswer = currentQuiz ? answers[currentQuiz.id] : undefined;
  const isCurrentAnswered = currentUserAnswer !== undefined;
  const isCurrentCorrect =
    currentQuiz && currentUserAnswer !== undefined
      ? normalizeAnswer(currentUserAnswer) === normalizeAnswer(currentQuiz.answer)
      : false;

  const renderBlankQuestionText = (quiz: MisconceptionQuizItem) => {
    const marker = '[ ___ ]';
    if (!quiz.question.includes(marker)) {
      return <span>{quiz.question}</span>;
    }
    const parts = quiz.question.split(marker);
    const fillText = isCurrentAnswered ? currentUserAnswer : '___';
    return (
      <span>
        {parts[0]}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '88px',
            padding: '2px 12px',
            margin: '0 4px',
            borderRadius: 'var(--radius-sm)',
            borderBottom: '3px solid',
            borderColor: isCurrentAnswered
              ? isCurrentCorrect
                ? '#059669'
                : '#dc2626'
              : '#0284c7',
            backgroundColor: isCurrentAnswered
              ? isCurrentCorrect
                ? '#d1fae5'
                : '#fee2e2'
              : '#e0f2fe',
            color: isCurrentAnswered
              ? isCurrentCorrect
                ? '#065f46'
                : '#991b1b'
              : '#0369a1',
            fontWeight: 800,
          }}
        >
          {fillText}
        </span>
        {parts.slice(1).join(marker)}
      </span>
    );
  };

  const percentage =
    totalCount > 0 ? Math.round((score / totalCount) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="misconception-quiz-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.68)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(820px, 100%)',
          maxHeight: 'min(90dvh, 720px)',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <header
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 20px',
            backgroundColor: 'var(--color-header-bg)',
            color: 'var(--color-header-text)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HelpCircle size={22} color="#38bdf8" />
            <div>
              <h2
                id="misconception-quiz-title"
                style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}
              >
                핵심 오개념 확인 형성평가 퀴즈
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.76rem',
                  color: 'var(--color-header-muted)',
                }}
              >
                [9과11-03] 호흡계의 구조·호흡 운동 원리·기체 교환 점검
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--color-header-surface)',
                border: '1px solid var(--color-header-border)',
                fontSize: '0.84rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: '#fde047',
              }}
            >
              현재 점수: {score} / {totalCount}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="퀴즈 창 닫기"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-header-border)',
                backgroundColor: 'var(--color-header-surface)',
                color: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Step-Through Progress Bar */}
        {totalCount > 0 && (
          <div
            style={{
              flexShrink: 0,
              padding: '10px 20px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid var(--color-border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${totalCount}, minmax(0, 1fr))`,
                gap: '6px',
                flex: 1,
              }}
            >
              {quizzes.map((item, index) => {
                const userAns = answers[item.id];
                const isDone = userAns !== undefined;
                const isRight =
                  isDone && normalizeAnswer(userAns) === normalizeAnswer(item.answer);
                const isActive = !showSummary && index === safeIndex;

                let bg = '#e2e8f0';
                let border = 'transparent';
                if (isDone) {
                  bg = isRight ? '#10b981' : '#ef4444';
                } else if (isActive) {
                  bg = '#0284c7';
                }
                if (isActive) {
                  border = '#0f172a';
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setShowSummary(false);
                      setCurrentIndex(index);
                    }}
                    aria-label={`${index + 1}번 문항으로 이동`}
                    style={{
                      height: '12px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: bg,
                      border: `2px solid ${border}`,
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.15s ease',
                    }}
                  />
                );
              })}
            </div>
            <span
              style={{
                fontSize: '0.84rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              {showSummary ? '결과 요약' : `${safeIndex + 1}/${totalCount}`}
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {totalCount === 0 ? (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
              }}
            >
              등록된 형성평가 문항이 없습니다.
            </div>
          ) : showSummary ? (
            /* Final Summary Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-lg)',
                  background:
                    percentage >= 80
                      ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                      : 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
                  border: `1px solid ${percentage >= 80 ? '#6ee7b7' : '#7dd3fc'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <Award
                    size={38}
                    color={percentage >= 80 ? '#059669' : '#0284c7'}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--color-text)',
                      }}
                    >
                      최종 점수: {score} / {totalCount} ({percentage}점)
                    </div>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--color-text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      {percentage === 100
                        ? '완벽합니다! 호흡계의 구조와 호흡 운동 원리를 정확히 이해했어요.'
                        : percentage >= 70
                        ? '잘했습니다! 아래 오개념 해설을 한 번 더 확인해 보세요.'
                        : '핵심 원리를 다시 짚어볼까요? 시뮬레이션과 함께 복습해 보세요.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRestart}
                  style={{ padding: '10px 18px', fontSize: '0.92rem' }}
                >
                  <RotateCcw size={16} />
                  <span>다시 풀기</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {quizzes.map((item, idx) => {
                  const userAns = answers[item.id];
                  const isCorrect =
                    userAns !== undefined &&
                    normalizeAnswer(userAns) === normalizeAnswer(item.answer);

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${isCorrect ? '#a7f3d0' : '#fecaca'}`,
                        backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 700,
                            fontSize: '0.92rem',
                          }}
                        >
                          {isCorrect ? (
                            <CheckCircle2 size={18} color="#059669" />
                          ) : (
                            <XCircle size={18} color="#dc2626" />
                          )}
                          <span>
                            {idx + 1}. {item.question}
                          </span>
                        </div>
                        <span className="badge badge-neutral">
                          {item.targetConcept}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          fontSize: '0.82rem',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <span>
                          선택한 답:{' '}
                          <strong>{userAns ?? '미응답'}</strong>
                        </span>
                        <span>
                          정답: <strong style={{ color: '#059669' }}>{item.answer}</strong>
                        </span>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.83rem',
                          color: 'var(--color-text-secondary)',
                          lineHeight: 1.45,
                        }}
                      >
                        {item.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Single Question View */
            currentQuiz && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Question Meta */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-inhale">
                      문항 {safeIndex + 1} / {totalCount}
                    </span>
                    <span className="badge badge-neutral">
                      {currentQuiz.type === 'OX' ? 'O / X 퀴즈' : '빈칸 채우기'}
                    </span>
                  </div>
                  <span className="badge badge-warning">
                    핵심 개념: {currentQuiz.targetConcept}
                  </span>
                </div>

                {/* Question Prompt */}
                <div
                  style={{
                    padding: '18px 20px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--color-border-light)',
                    fontSize: '1.18rem',
                    fontWeight: 700,
                    lineHeight: 1.55,
                    color: 'var(--color-text)',
                  }}
                >
                  {currentQuiz.type === 'BLANK'
                    ? renderBlankQuestionText(currentQuiz)
                    : currentQuiz.question}
                </div>

                {/* Answer Controls */}
                {currentQuiz.type === 'OX' ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {(['O', 'X'] as const).map((choice) => {
                      const isSelected = currentUserAnswer === choice;
                      const isCorrectOption = currentQuiz.answer === choice;

                      let bg = '#ffffff';
                      let border = 'var(--color-border)';
                      let text = choice === 'O' ? '#0284c7' : '#dc2626';

                      if (isCurrentAnswered) {
                        if (isCorrectOption) {
                          bg = '#d1fae5';
                          border = '#10b981';
                          text = '#065f46';
                        } else if (isSelected) {
                          bg = '#fee2e2';
                          border = '#ef4444';
                          text = '#991b1b';
                        }
                      }

                      return (
                        <button
                          key={choice}
                          type="button"
                          disabled={isCurrentAnswered}
                          onClick={() => handleSelectAnswer(currentQuiz.id, choice)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '20px 16px',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${border}`,
                            backgroundColor: bg,
                            color: text,
                            cursor: isCurrentAnswered ? 'default' : 'pointer',
                            transition: 'transform 0.12s ease, box-shadow 0.15s ease',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '2.4rem',
                              fontWeight: 900,
                              lineHeight: 1,
                            }}
                          >
                            {choice}
                          </span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                            {choice === 'O' ? '그렇다 (맞음)' : '아니다 (틀림)'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* BLANK Question Controls */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {currentQuiz.options &&
                      currentQuiz.options.length > 0 &&
                      !useTextInput && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: '10px',
                          }}
                        >
                          {currentQuiz.options.map((option, optIdx) => {
                            const isSelected = currentUserAnswer === option;
                            const isCorrectOption =
                              normalizeAnswer(currentQuiz.answer) ===
                              normalizeAnswer(option);

                            let bg = '#ffffff';
                            let border = 'var(--color-border)';
                            let color = 'var(--color-text)';

                            if (isCurrentAnswered) {
                              if (isCorrectOption) {
                                bg = '#d1fae5';
                                border = '#10b981';
                                color = '#065f46';
                              } else if (isSelected) {
                                bg = '#fee2e2';
                                border = '#ef4444';
                                color = '#991b1b';
                              }
                            }

                            return (
                              <button
                                key={option}
                                type="button"
                                disabled={isCurrentAnswered}
                                onClick={() =>
                                  handleSelectAnswer(currentQuiz.id, option)
                                }
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '14px 16px',
                                  borderRadius: 'var(--radius-md)',
                                  border: `2px solid ${border}`,
                                  backgroundColor: bg,
                                  color,
                                  fontSize: '1.02rem',
                                  fontWeight: 700,
                                  cursor: isCurrentAnswered ? 'default' : 'pointer',
                                  textAlign: 'left',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: 'var(--radius-pill)',
                                    backgroundColor: 'var(--color-surface-muted)',
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    flexShrink: 0,
                                  }}
                                >
                                  {optIdx + 1}
                                </span>
                                <span>{option}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                    {/* Text input fallback (shown automatically if no options, or via toggle) */}
                    {(!currentQuiz.options ||
                      currentQuiz.options.length === 0 ||
                      useTextInput) && (
                      <form
                        onSubmit={(e) => handleSubmitTextAnswer(e, currentQuiz.id)}
                        style={{ display: 'flex', gap: '8px' }}
                      >
                        <input
                          type="text"
                          value={textDraft}
                          disabled={isCurrentAnswered}
                          onChange={(e) => setTextDraft(e.target.value)}
                          placeholder="빈칸에 들어갈 알맞은 단어를 입력하세요"
                          aria-label="빈칸 정답 입력"
                          style={{
                            flex: 1,
                            padding: '11px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: '2px solid var(--color-border)',
                            fontSize: '1rem',
                            fontWeight: 600,
                          }}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={isCurrentAnswered || !textDraft.trim()}
                          style={{ padding: '10px 18px', fontSize: '0.94rem' }}
                        >
                          정답 확인
                        </button>
                      </form>
                    )}

                    {currentQuiz.options &&
                      currentQuiz.options.length > 0 &&
                      !isCurrentAnswered && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setUseTextInput((prev) => !prev)}
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          >
                            <Keyboard size={13} />
                            <span>
                              {useTextInput ? '보기 버튼으로 풀기' : '직접 입력으로 풀기'}
                            </span>
                          </button>
                        </div>
                      )}
                  </div>
                )}

                {/* Immediate Feedback & Causal Explanation */}
                {isCurrentAnswered && (
                  <div
                    role="status"
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isCurrentCorrect ? '#ecfdf5' : '#fef2f2',
                      borderLeft: `5px solid ${
                        isCurrentCorrect ? '#059669' : '#dc2626'
                      }`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: isCurrentCorrect ? '#065f46' : '#991b1b',
                      }}
                    >
                      {isCurrentCorrect ? (
                        <>
                          <CheckCircle2 size={20} color="#059669" />
                          <span>정답입니다!</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} color="#dc2626" />
                          <span>
                            아쉽습니다! 정답은 &ldquo;{currentQuiz.answer}&rdquo; 입니다.
                          </span>
                        </>
                      )}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        color: 'var(--color-text)',
                        lineHeight: 1.5,
                      }}
                    >
                      {currentQuiz.explanation}
                    </p>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        {totalCount > 0 && (
          <footer
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '12px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid var(--color-border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!showSummary && (
                <button
                  type="button"
                  className="btn"
                  onClick={handlePrev}
                  disabled={safeIndex === 0}
                >
                  <ChevronLeft size={16} />
                  <span>이전 문항</span>
                </button>
              )}
              <button
                type="button"
                className="btn"
                onClick={handleRestart}
                title="모든 문항을 초기화하고 처음부터 다시 풉니다"
              >
                <RotateCcw size={15} />
                <span>다시 풀기</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!showSummary ? (
                <>
                  {answeredCount === totalCount && safeIndex < totalCount - 1 && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowSummary(true)}
                    >
                      결과 요약 보기
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={!isCurrentAnswered}
                  >
                    <span>
                      {safeIndex === totalCount - 1 ? '결과 보기' : '다음 문항'}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  수업 화면으로 돌아가기
                </button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};
