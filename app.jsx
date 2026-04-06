const { useState, useEffect, createElement } = React;

function App() {
  // 상태 관리
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const days = ['월', '화', '수', '목', '금'];
  const periods = [1, 2, 3, 4, 5, 6, 7];
  
  const [selectedDay, setSelectedDay] = useState('월');
  const [viewMode, setViewMode] = useState('main'); 
  const [selectedCell, setSelectedCell] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null);

  // 초기 상태
  const [timetable, setTimetable] = useState({
    '월': { 1: '1학년 1반', 2: '1학년 2반', 4: '1학년 3반', 6: '동아리' },
    '화': { 2: '1학년 4반', 3: '1학년 1반', 5: '1학년 2반' },
    '수': { 1: '1학년 3반', 3: '1학년 4반', 4: '1학년 1반', 5: '교직원회의' },
    '목': { 2: '1학년 2반', 4: '1학년 3반', 6: '1학년 4반' },
    '금': { 1: '1학년 1반', 3: '1학년 2반', 5: '1학년 3반', 6: '1학년 4반' },
  });

  const [periodTimes, setPeriodTimes] = useState({
    1: '08:50 ~ 09:35', 2: '09:45 ~ 10:30', 3: '10:40 ~ 11:25', 4: '11:35 ~ 12:20',
    5: '13:10 ~ 13:55', 6: '14:05 ~ 14:50', 7: '15:00 ~ 15:45',
  });

  const [classRecords, setClassRecords] = useState({});
  const [tempTimetable, setTempTimetable] = useState({});
  const [tempPeriodTimes, setTempPeriodTimes] = useState({});

  // 클라우드 인증 (익명 로그인) 및 데이터 동기화
  useEffect(() => {
    // index.html에서 선언한 전역 auth 객체 사용
    auth.signInAnonymously().catch((error) => console.error("인증 실패", error));
    
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // index.html에서 선언한 전역 db 객체 사용
    const docRef = db.collection('users').doc(user.uid);
    
    const unsub = docRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data.timetable) setTimetable(data.timetable);
        if (data.periodTimes) setPeriodTimes(data.periodTimes);
        if (data.classRecords) setClassRecords(data.classRecords);
      }
      setIsLoaded(true);
    }, (error) => {
      console.error("데이터 동기화 에러", error);
      setIsLoaded(true); // 에러가 나도 화면은 띄워줌
    });
    
    return () => unsub();
  }, [user]);

  // 클라우드 저장
  const saveToCloud = (newTimetable, newPeriodTimes, newClassRecords) => {
    if (!user) return;
    db.collection('users').doc(user.uid).set({
      timetable: newTimetable || timetable,
      periodTimes: newPeriodTimes || periodTimes,
      classRecords: newClassRecords || classRecords
    }, { merge: true }).catch(err => console.error("저장 실패", err));
  };

  // ----------------------------------------------------------------------
  // 아래부터는 기능 및 UI 코드 (이전 버전과 동일)
  // ----------------------------------------------------------------------

  const handleAddRecord = (className) => {
    const today = new Date();
    const dateString = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
    
    const newRecord = {
      id: Date.now().toString(),
      date: dateString,
      currentProgress: '',
      nextLesson: '',
      worksheetGiven: false
    };

    const newRecords = {
      ...classRecords,
      [className]: [newRecord, ...(classRecords[className] || [])]
    };
    
    setClassRecords(newRecords);
    setEditingRecordId(newRecord.id);
    saveToCloud(null, null, newRecords);
  };

  const handleUpdateRecord = (className, recordId, field, value) => {
    setClassRecords(prev => ({
      ...prev,
      [className]: prev[className].map(record => 
        record.id === recordId ? { ...record, [field]: value } : record
      )
    }));
  };

  const handleToggleWorksheet = (className, recordId, currentValue) => {
    const newRecords = {
      ...classRecords,
      [className]: classRecords[className].map(record => 
        record.id === recordId ? { ...record, worksheetGiven: !currentValue } : record
      )
    };
    setClassRecords(newRecords);
    saveToCloud(null, null, newRecords);
  };

  const handleFinishEdit = () => {
    setEditingRecordId(null);
    saveToCloud(null, null, classRecords);
  };

  const handleDeleteRecord = (className, recordId) => {
    const newRecords = {
      ...classRecords,
      [className]: classRecords[className].filter(record => record.id !== recordId)
    };
    setClassRecords(newRecords);
    saveToCloud(null, null, newRecords);
  };

  const openDetail = (day, period, className) => {
    let currentRecords = classRecords;
    if (!currentRecords[className]) {
      currentRecords = { ...currentRecords, [className]: [] };
      setClassRecords(currentRecords);
      saveToCloud(null, null, currentRecords);
    }
    setSelectedCell({ day, period, className });
    setViewMode('detail');
    setEditingRecordId(null);
  };

  const openSettings = () => {
    setTempTimetable(JSON.parse(JSON.stringify(timetable)));
    setTempPeriodTimes(JSON.parse(JSON.stringify(periodTimes)));
    setViewMode('settings');
  };

  const saveSettings = () => {
    setTimetable(tempTimetable);
    setPeriodTimes(tempPeriodTimes);
    setViewMode('main');
    saveToCloud(tempTimetable, tempPeriodTimes, null);
  };

  const getClassColor = (className) => {
    if (!className) return 'bg-transparent';
    if (className.includes('1반')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (className.includes('2반')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (className.includes('3반')) return 'bg-violet-100 text-violet-800 border-violet-200';
    if (className.includes('4반')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (className.includes('5반')) return 'bg-pink-100 text-pink-800 border-pink-200';
    if (className.includes('6반')) return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  // 아이콘 렌더링 헬퍼 (Lucide)
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  const Icon = ({ name, className }) => {
    return <i data-lucide={name} className={className}></i>;
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-indigo-600 gap-3">
        <Icon name="loader-2" className="animate-spin w-10 h-10" />
        <p className="text-sm font-bold text-gray-500">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-800 font-sans sm:p-6 p-0 flex justify-center items-center">
      <div className="w-full max-w-md bg-white sm:rounded-[2.5rem] sm:shadow-2xl sm:border-[10px] border-gray-200 overflow-hidden relative flex flex-col h-[100dvh] sm:h-[850px]">
        
        {/* === 1. 메인 화면 === */}
        <div className={`flex flex-col h-full absolute w-full transition-transform duration-300 ease-in-out ${viewMode === 'main' ? 'translate-x-0' : '-translate-x-full'}`}>
          <header className="bg-white pt-12 pb-4 px-6 border-b border-gray-100 flex-shrink-0 flex justify-between items-end z-10">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <Icon name="calendar-days" className="text-indigo-600 w-6 h-6" />
                나의 시간표
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">수업을 터치하여 주간 진도를 기록하세요.</p>
            </div>
            <button onClick={openSettings} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors mb-1">
              <Icon name="settings" className="w-6 h-6" />
            </button>
          </header>

          <div className="flex bg-white border-b border-gray-100 px-2 py-2 flex-shrink-0 shadow-sm z-10">
            {days.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${
                  selectedDay === day ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 transform scale-105' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 pb-20">
            <div className="space-y-3">
              {periods.map(period => {
                const className = timetable[selectedDay]?.[period];
                const hasClass = !!className && className.trim() !== '';
                const latestRecord = hasClass && classRecords[className] && classRecords[className].length > 0 
                                     ? classRecords[className][0] : null;

                return (
                  <div 
                    key={period}
                    onClick={() => hasClass && openDetail(selectedDay, period, className)}
                    className={`flex items-stretch bg-white rounded-3xl overflow-hidden border ${
                      hasClass ? 'cursor-pointer hover:shadow-md transition-all active:scale-[0.98] border-gray-200 shadow-sm' : 'border-transparent opacity-60'
                    }`}
                  >
                    <div className={`w-20 flex flex-col items-center justify-center py-3 border-r border-gray-100 ${hasClass ? 'bg-gray-50' : 'bg-transparent'}`}>
                      <span className="text-lg font-black text-gray-800">{period}<span className="text-[10px] font-bold text-gray-400 ml-0.5">교시</span></span>
                      {periodTimes[period] && (
                        <span className="text-[9px] font-semibold text-gray-400 mt-1 px-1 text-center leading-tight">
                          {periodTimes[period].split('~').map((t, i) => (
                            <React.Fragment key={i}>{t.trim()}{i === 0 && <br/>}</React.Fragment>
                          ))}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 p-4 flex items-center justify-between">
                      {hasClass ? (
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${getClassColor(className)}`}>
                            {className}
                          </span>
                          <span className="text-xs text-gray-500 font-medium hidden sm:inline-block truncate max-w-[100px]">
                            {latestRecord && latestRecord.currentProgress ? latestRecord.currentProgress : '기록 없음'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 font-medium italic text-sm">- 공강 -</span>
                      )}
                      {hasClass && <Icon name="chevron-left" className="text-gray-400 rotate-180 w-5 h-5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* === 2. 상세 타임라인 화면 === */}
        <div className={`absolute top-0 left-0 w-full h-full bg-[#F9FAFB] z-20 transition-transform duration-300 ease-in-out flex flex-col ${viewMode === 'detail' ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedCell && (() => {
            const records = classRecords[selectedCell.className] || [];
            const headerColor = getClassColor(selectedCell.className).split(' ')[0].replace('-100', '-500');
            const actualHeaderColor = headerColor === 'bg-transparent' ? 'bg-gray-800' : headerColor;

            return (
              <>
                <header className={`pt-12 pb-6 px-6 ${actualHeaderColor} text-white flex-shrink-0 transition-colors duration-300 shadow-sm z-10`}>
                  <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setViewMode('main')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 backdrop-blur-sm">
                      <Icon name="chevron-left" className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => handleAddRecord(selectedCell.className)}
                      className="flex items-center gap-1.5 px-4 h-10 bg-white text-gray-900 rounded-full text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Icon name="plus" className="w-4 h-4 stroke-[3px]" /> 새 기록
                    </button>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-white/80 text-sm font-bold mb-1.5">
                      <Icon name="clock" className="w-4 h-4" /> 
                      {selectedCell.day}요일 {selectedCell.period}교시 
                      <span className="opacity-70 ml-1">({periodTimes[selectedCell.period]})</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <h2 className="text-3xl font-extrabold tracking-tight">{selectedCell.className}</h2>
                      <div className="text-white/80 text-xs font-semibold flex items-center gap-1">
                        <Icon name="history" className="w-3.5 h-3.5" /> 총 {records.length}개
                      </div>
                    </div>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 bg-white">
                  {records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                      <Icon name="history" className="w-12 h-12 opacity-20" />
                      <p className="font-medium text-sm">아직 작성된 진도 기록이 없습니다.</p>
                      <button 
                        onClick={() => handleAddRecord(selectedCell.className)}
                        className="px-6 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-2xl"
                      >
                        첫 기록 작성하기
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {records.map((record, index) => {
                        const isEditing = editingRecordId === record.id;
                        const isFirst = index === 0;

                        return (
                          <div key={record.id} className="relative pl-6 pb-8 border-l-2 border-indigo-100 last:border-transparent last:pb-0">
                            <div className={`absolute w-4 h-4 rounded-full -left-[9px] top-1 border-4 border-white shadow-sm ${isFirst ? 'bg-indigo-500 scale-125' : 'bg-gray-300'}`}></div>
                            
                            <div className={`bg-white rounded-3xl p-5 border ${isEditing ? 'border-indigo-400 shadow-md ring-4 ring-indigo-50' : 'border-gray-100 shadow-sm'} transition-all`}>
                              
                              <div className="flex justify-between items-center mb-4">
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={record.date} 
                                    onChange={(e) => handleUpdateRecord(selectedCell.className, record.id, 'date', e.target.value)}
                                    className="font-bold text-sm bg-gray-50 text-gray-800 px-3 py-1 rounded-lg outline-none border border-gray-200 focus:border-indigo-500 w-32"
                                  />
                                ) : (
                                  <span className="font-bold text-sm text-gray-500">{record.date}</span>
                                )}

                                <div className="flex gap-2">
                                  {isEditing ? (
                                    <>
                                      <button onClick={() => handleDeleteRecord(selectedCell.className, record.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                                        <Icon name="trash-2" className="w-4 h-4" />
                                      </button>
                                      <button onClick={handleFinishEdit} className="flex items-center gap-1 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                                        <Icon name="check-circle-2" className="w-3.5 h-3.5" /> 완료
                                      </button>
                                    </>
                                  ) : (
                                    <button onClick={() => setEditingRecordId(record.id)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg">
                                      <Icon name="edit-3" className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div 
                                  onClick={() => isEditing && handleToggleWorksheet(selectedCell.className, record.id, record.worksheetGiven)}
                                  className={`flex justify-between items-center p-3 rounded-xl transition-colors ${isEditing ? 'cursor-pointer hover:bg-gray-50 border border-gray-100' : ''}`}
                                >
                                  <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                    <Icon name="file-text" className={`w-4 h-4 ${record.worksheetGiven ? 'text-indigo-500' : 'text-gray-400'}`}/> 활동지 배부
                                  </span>
                                  {record.worksheetGiven ? <Icon name="check-circle-2" className="text-indigo-600 w-6 h-6" /> : <Icon name="circle" className="text-gray-300 w-6 h-6" />}
                                </div>

                                <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                                  <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-1.5">
                                    <Icon name="book-open" className="w-3 h-3" /> 어디까지 했나
                                  </label>
                                  {isEditing ? (
                                    <input 
                                      type="text" value={record.currentProgress}
                                      onChange={(e) => handleUpdateRecord(selectedCell.className, record.id, 'currentProgress', e.target.value)}
                                      placeholder="진도를 입력하세요"
                                      className="w-full bg-white text-gray-900 text-sm font-semibold rounded-lg px-3 py-2 outline-none border border-indigo-200 focus:border-indigo-500"
                                    />
                                  ) : (
                                    <p className="text-sm font-semibold text-gray-800">{record.currentProgress || '-'}</p>
                                  )}
                                </div>

                                <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                                  <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-1.5">
                                    <Icon name="map-pin" className="w-3 h-3" /> 다음 수업 계획
                                  </label>
                                  {isEditing ? (
                                    <textarea 
                                      value={record.nextLesson}
                                      onChange={(e) => handleUpdateRecord(selectedCell.className, record.id, 'nextLesson', e.target.value)}
                                      placeholder="계획을 입력하세요"
                                      className="w-full bg-white text-gray-900 text-sm font-medium rounded-lg px-3 py-2 outline-none border border-indigo-200 focus:border-indigo-500 resize-none h-20"
                                    />
                                  ) : (
                                    <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap">{record.nextLesson || '-'}</p>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="h-12"></div>
                </div>
              </>
            );
          })()}
        </div>

        {/* === 3. 설정 화면 === */}
        <div className={`absolute top-0 left-0 w-full h-full bg-white z-30 transition-transform duration-400 ease-out flex flex-col ${viewMode === 'settings' ? 'translate-y-0' : 'translate-y-full'}`}>
          <header className="pt-12 pb-4 px-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <button onClick={() => setViewMode('main')} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full">
              <Icon name="x" className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">시간표 설정</h2>
            <button onClick={saveSettings} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-indigo-700">
              저장
            </button>
          </header>

          <div className="flex-1 overflow-y-auto bg-gray-50 pb-20">
            <div className="p-4 bg-white mb-2 shadow-sm border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="clock" className="text-indigo-600 w-4 h-4" /> 교시별 시간 설정
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {periods.map(period => (
                  <div key={`time-${period}`} className="flex items-center bg-gray-50 rounded-xl p-1.5 border border-gray-200">
                    <span className="w-8 text-center text-xs font-black text-gray-500">{period}</span>
                    <input
                      type="text"
                      value={tempPeriodTimes[period] || ''}
                      onChange={(e) => setTempPeriodTimes(prev => ({ ...prev, [period]: e.target.value }))}
                      placeholder="08:50~09:35"
                      className="flex-1 bg-transparent text-xs font-semibold text-gray-800 outline-none w-full px-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Icon name="book-open" className="text-indigo-600 w-4 h-4" /> 수업 배정
                </h3>
              </div>
              
              <div className="flex bg-white border-b border-gray-200 px-2 py-2 sticky top-0 z-10">
                {days.map(day => (
                  <button
                    key={`tab-${day}`}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                      selectedDay === day ? 'bg-gray-100 text-indigo-600 shadow-inner' : 'text-gray-500'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <div className="p-4 space-y-3">
                {periods.map(period => (
                  <div key={`class-${period}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-black text-indigo-600 border border-indigo-100">
                      {period}
                    </div>
                    <input
                      type="text"
                      value={tempTimetable[selectedDay]?.[period] || ''}
                      onChange={(e) => setTempTimetable(prev => ({ ...prev, [selectedDay]: { ...prev[selectedDay], [period]: e.target.value } }))}
                      placeholder="반 이름 입력 (예: 1학년 1반)"
                      className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white text-sm font-bold text-gray-800 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// React 렌더링
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);