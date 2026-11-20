import './style.css';
import { route } from './ui/app';

window.addEventListener('hashchange', route);
route();
