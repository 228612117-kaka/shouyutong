import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { getSignDetails, generateSignImage } from './services/geminiService';
import { storageService } from './services/storageService';
import { SignDetails, AppState, SavedSign } from './types';

const App: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<SignDetails | null>(null);
  const [signImage, setSignImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [library, setLibrary] = useState<Record<string, SavedSign>>({});
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLibrary(storageService.getLibrary());
    const authStatus = sessionStorage.getItem('shouyutong_auth');
    if (authStatus === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleSearch = useCallback(async (e?: React.FormEvent, targetWord?: string) => {
    if (e) e.preventDefault();
    const wordToSearch = targetWord || keyword.trim();
    if (!wordToSearch) return;

    setState(AppState.LOADING);
    setError(null);
    setResult(null);
    setSignImage(null);
    setIsImageLoading(false);
    setIsEditing(false);

    const localOverride = storageService.getWord(wordToSearch);
    if (localOverride) {
      setResult(localOverride);
      setSignImage(localOverride.imageUrl);
      setState(AppState.SUCCESS);
      return;
    }

    try {
      // 仅获取文字信息，不等待图片生成
      const details = await getSignDetails(wordToSearch);
      setResult(details);
      setState(AppState.SUCCESS);
    } catch (err) {
      console.error(err);
      setError('抱歉，未能查询到该词语的手语信息，请尝试其他词汇。');
      setState(AppState.ERROR);
    }
  }, [keyword]);

  const handleManualGenerateImage = async () => {
    if (!result) return;
    setIsImageLoading(true);
    try {
      const img = await generateSignImage(result.word, result.movement);
      setSignImage(img);
    } catch (err) {
      console.error(err);
      alert('图解生成失败，请稍后重试。');
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleAddNew = () => {
    const emptySign: SignDetails = {
      word: '',
      pinyin: '',
      definition: '',
      handShape: '',
      movement: '',
      location: '',
      tips: ''
    };
    setResult(emptySign);
    setSignImage(null);
    setIsEditing(true);
    setState(AppState.SUCCESS);
  };

  const handleSave = () => {
    if (!result || !result.word.trim()) {
      alert('请输入词语名称');
      return;
    }
    const signToSave: SavedSign = {
      ...result,
      imageUrl: signImage,
      updatedAt: Date.now()
    };
    storageService.saveWord(signToSave);
    setLibrary(storageService.getLibrary());
    setIsEditing(false);
    alert('保存成功！该词条已加入您的本地后台。');
  };

  const handleDelete = (word: string) => {
    if (window.confirm(`确定要删除“${word}”的自定义数据吗？`)) {
      storageService.deleteWord(word);
      setLibrary(storageService.getLibrary());
      if (result?.word === word) {
        setState(AppState.IDLE);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === '123456') {
      setIsLoggedIn(true);
      setLoginError('');
      sessionStorage.setItem('shouyutong_auth', 'true');
    } else {
      setLoginError('账号或密码错误');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('shouyutong_auth');
    setState(AppState.IDLE);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (storageService.importData(content)) {
        setLibrary(storageService.getLibrary());
        alert('数据导入成功！');
      } else {
        alert('导入失败，请检查文件格式。');
      }
    };
    reader.readAsText(file);
  };

  const renderHome = () => (
    <>
      <section className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
          探索指尖的语言
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          输入您想了解的词语，秒速获取手势解析。
        </p>
      </section>

      <div className="max-w-2xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入中文词语，如：你好、谢谢、家..."
            className="w-full pl-6 pr-24 py-4 rounded-2xl border-2 border-blue-100 focus:border-blue-500 focus:outline-none shadow-sm transition-all text-lg"
          />
          <button
            type="submit"
            disabled={state === AppState.LOADING}
            className="absolute right-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === AppState.LOADING ? '正在查阅...' : '查询打法'}
          </button>
        </form>
      </div>

      {state === AppState.ERROR && (
        <div className="max-w-2xl mx-auto bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 mb-8 text-center font-medium">
          {error}
        </div>
      )}

      {state === AppState.IDLE && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto opacity-70">
          {['你好', '谢谢', '北京', '学习'].map((word) => (
            <button
              key={word}
              onClick={() => { handleSearch(undefined, word); }}
              className="px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all text-sm font-medium"
            >
              试试 "{word}"
            </button>
          ))}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-12">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
               {isEditing && !library[result.word] ? '新建词条' : '词条详情'}
             </span>
             {isLoggedIn && (
               <div className="flex gap-2">
                  {!isEditing ? (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      编辑内容
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          if (!library[result.word]) setState(AppState.IDLE);
                        }}
                        className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all"
                      >
                        取消
                      </button>
                      <button 
                        onClick={handleSave}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 shadow-md shadow-blue-200"
                      >
                        保存修改
                      </button>
                    </div>
                  )}
               </div>
             )}
          </div>
          <div className="md:flex">
            <div className="md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 flex flex-col items-center justify-center min-h-[400px]">
              {signImage ? (
                <div className="relative group w-full flex flex-col items-center">
                  <img 
                    src={signImage} 
                    alt={result.word} 
                    className="w-full max-w-sm rounded-2xl shadow-lg border-4 border-white animate-in zoom-in-95 duration-500"
                  />
                  {isEditing && (
                    <div className="mt-4 w-full">
                       <label className="cursor-pointer bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center hover:border-blue-400 hover:bg-blue-50 transition-all">
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                          <span className="text-sm font-medium text-gray-600">点击替换图片</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                       </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full max-w-sm">
                  {isEditing ? (
                    <label className="cursor-pointer bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center hover:border-blue-400 hover:bg-blue-50 transition-all">
                        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span className="text-sm font-medium text-gray-500">上传演示图</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-6 p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
                      <div className={`w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 ${isImageLoading ? 'animate-bounce' : ''}`}>
                         <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">手语视觉辅助</h4>
                        <p className="text-sm text-gray-500 mb-6">目前还没有手语图解，您可以生成一个 AI 参考图。</p>
                        <button 
                          onClick={handleManualGenerateImage}
                          disabled={isImageLoading}
                          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                        >
                          {isImageLoading ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              正在生成 AI 绘图...
                            </>
                          ) : '生成 AI 视觉图解'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="md:w-1/2 p-8">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  {isEditing ? (
                    <div className="w-full space-y-3">
                       <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase mb-1">词语</label>
                         <input 
                           className="text-2xl font-bold text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none w-full"
                           value={result.word}
                           placeholder="词语名称"
                           onChange={(e) => setResult({...result, word: e.target.value})}
                         />
                       </div>
                       <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase mb-1">拼音</label>
                         <input 
                           className="text-gray-600 font-medium border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none w-full"
                           value={result.pinyin}
                           placeholder="拼音"
                           onChange={(e) => setResult({...result, pinyin: e.target.value})}
                         />
                       </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-3xl font-bold text-gray-900">{result.word}</h3>
                      <span className="text-gray-500 font-medium tracking-wide">{result.pinyin}</span>
                    </>
                  )}
                </div>
                {isEditing ? (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">词义解析</label>
                    <textarea 
                      className="text-gray-600 leading-relaxed border border-gray-200 rounded-lg p-3 w-full h-24 focus:border-blue-500 outline-none"
                      value={result.definition}
                      placeholder="词义描述..."
                      onChange={(e) => setResult({...result, definition: e.target.value})}
                    />
                  </div>
                ) : (
                  <p className="text-gray-600 leading-relaxed border-l-4 border-blue-500 pl-4 py-1 mt-3">
                    {result.definition}
                  </p>
                )}
              </div>

              <div className="space-y-6 mt-8">
                {[
                  { label: '手势形状', key: 'handShape', icon: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.223 0 2.39.22 3.47.621m3.94 3.94A10.002 10.002 0 0117 13.5' },
                  { label: '动作过程', key: 'movement', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
                  { label: '手部位置', key: 'location', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' }
                ].map(item => (
                  <section key={item.key}>
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path></svg>
                      {item.label}
                    </h4>
                    {isEditing ? (
                      <textarea 
                        className="text-gray-800 leading-relaxed border border-gray-200 rounded-lg p-2 w-full h-20 focus:border-blue-500 outline-none text-sm"
                        value={(result as any)[item.key]}
                        placeholder={`详细描述${item.label}...`}
                        onChange={(e) => setResult({...result, [item.key]: e.target.value})}
                      />
                    ) : (
                      <p className="text-gray-800 leading-relaxed text-sm sm:text-base">{ (result as any)[item.key] }</p>
                    )}
                  </section>
                ))}

                <div className="mt-8 pt-6 border-t border-gray-100">
                   <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-1">学习贴士</p>
                    {isEditing ? (
                      <textarea 
                        className="text-sm text-gray-800 border border-blue-100 rounded-lg p-2 w-full h-20 outline-none bg-white focus:ring-2 focus:ring-blue-100"
                        value={result.tips}
                        placeholder="输入练习技巧..."
                        onChange={(e) => setResult({...result, tips: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm text-gray-700">{result.tips}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderLogin = () => (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-gray-100 p-8">
        <div className="text-center mb-10">
           <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-200">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
           </div>
           <h2 className="text-2xl font-bold text-gray-900">管理员登录</h2>
           <p className="text-gray-400 text-sm mt-2">请使用您的管理凭据进入后台</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">用户名</label>
            <input 
              type="text"
              required
              autoFocus
              className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
              value={loginForm.username}
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              placeholder="请输入管理员账号"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">密码</label>
            <input 
              type="password"
              required
              className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              placeholder="请输入密码"
            />
          </div>
          
          {loginError && (
            <div className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-xl animate-bounce">
              ⚠️ {loginError}
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 mt-4 active:scale-95"
          >
            立即进入后台
          </button>
        </form>
      </div>
    </div>
  );

  const renderManage = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">后台词库管理</h2>
            <button 
              onClick={handleLogout}
              className="text-[10px] text-gray-400 border border-gray-200 px-2 py-0.5 rounded-md hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all uppercase font-bold"
            >
              登出
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-1">您可以手动定义特定词汇的表现，覆盖 AI 生成的内容。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Export/Import Buttons */}
          <button 
            onClick={storageService.exportData}
            title="导出备份文件 (JSON)"
            className="p-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </button>
          <button 
            onClick={handleImportClick}
            title="导入备份文件 (JSON)"
            className="p-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all mr-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />

          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            添加新词条
          </button>
          <button 
            onClick={() => {
              if(confirm('警告：此操作将永久清空您所有的自定义词条！')) {
                storageService.clearAll();
                setLibrary({});
              }
            }}
            className="text-gray-400 text-xs hover:text-red-500 px-3 py-2"
          >
            重置词库
          </button>
        </div>
      </div>

      {Object.values(library).length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <div className="text-gray-200 mb-6">
             <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <p className="text-gray-400 font-medium">您的词库目前空空如也</p>
          <button 
            onClick={handleAddNew}
            className="mt-6 px-8 py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold hover:bg-blue-100 transition-all"
          >
            开启第一条记录
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {(Object.values(library) as SavedSign[]).sort((a, b) => b.updatedAt - a.updatedAt).map((item) => (
            <div key={item.word} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group flex gap-5">
               <div className="w-24 h-24 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-50 shadow-inner">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.word} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                )}
               </div>
               <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-900 truncate flex items-center gap-2">
                        {item.word} 
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{item.pinyin}</span>
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">{item.definition || '未填写词义解析'}</p>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <button 
                      onClick={() => {
                        setResult(item);
                        setSignImage(item.imageUrl);
                        setIsEditing(false);
                        setState(AppState.SUCCESS);
                      }}
                      className="text-xs text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                    >
                      查看与编辑
                    </button>
                    <button 
                      onClick={() => handleDelete(item.word)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      title="永久删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Layout 
      onNavigate={(view) => {
        if (view === 'home') {
          setState(AppState.IDLE);
          setResult(null);
          setSignImage(null);
          setIsEditing(false);
          setIsImageLoading(false);
        } else {
          setState(AppState.MANAGE);
        }
      }} 
      currentView={state === AppState.MANAGE ? 'manage' : 'home'}
    >
      {state === AppState.MANAGE 
        ? (isLoggedIn ? renderManage() : renderLogin()) 
        : renderHome()}
    </Layout>
  );
};

export default App;