import './styles.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { regie } from './liaison-regie.svelte.js';

const hote = document.querySelector('#regie');
if (!hote) throw new Error('Hôte introuvable dans regie/index.html');

mount(App, { target: hote });
regie.demarrer();
