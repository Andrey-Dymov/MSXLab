import {ButtonHints} from './components/ButtonHints';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'dockview-react/dist/styles/dockview.css';
import './styles.css';
for(const [key,value] of Object.entries(window.desktop?.preferences||{})){localStorage.setItem(key,value);}
ReactDOM.createRoot(document.getElementById('root')!).render(<><App /><ButtonHints /></>);
