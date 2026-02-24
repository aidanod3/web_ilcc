import { useState } from 'react';
import Header from '../components/Header/Header.jsx';
import Editor from '../components/Editor/Editor.jsx';
import RightPanel from '../components/RightPanel/RightPanel.jsx';
import Terminal from '../components/Terminal/Terminal.jsx';
import MemoryView from '../components/MemoryView/MemoryView.jsx';


export default function Main() {
  return (
    <div className="app">
      <Header/>
      <div className="main-grid">
        {/* <Editor />
        <RightPanel />
        <Terminal />
        <MemoryView /> */}
      </div>
    </div>
  )
}
