const PHONE = '5511910060796';
const messages = {
  geral: 'Olá, Luciana! Conheci seu trabalho pelo site e gostaria de saber mais sobre consórcio.',
  imovel: 'Olá, Luciana! Vi seu site e gostaria de fazer uma simulação para consórcio de imóvel.',
  automovel: 'Olá, Luciana! Vi seu site e gostaria de fazer uma simulação para consórcio de automóvel.',
  pesado: 'Olá, Luciana! Vi seu site e gostaria de conhecer as opções de consórcio para veículos pesados.'
};
const waUrl = message => `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
const track = (event, params = {}) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
};

document.querySelectorAll('[data-whatsapp]').forEach(link => {
  const type = link.dataset.whatsapp;
  link.href = waUrl(messages[type] || messages.geral);
  link.target = '_blank'; link.rel = 'noopener';
  link.addEventListener('click', () => track('whatsapp_click', { objective: type }));
});
document.querySelectorAll('[data-event]').forEach(el => el.addEventListener('click', () => track(el.dataset.event)));

const header = document.querySelector('#header');
const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
const menuBackdrop = document.createElement('div');
menuBackdrop.className = 'mobile-nav-backdrop';
header.appendChild(menuBackdrop);
const updateHeader = () => header.classList.toggle('scrolled', scrollY > 24);
addEventListener('scroll', updateHeader, { passive: true }); updateHeader();
function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  mobileMenu.classList.toggle('open', open);
  menuBackdrop.classList.toggle('open', open);
  header.classList.toggle('menu-open', open);
  document.documentElement.classList.toggle('menu-locked', open);
  document.body.classList.toggle('menu-locked', open);
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
menuBackdrop.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

const form = document.querySelector('#lead-form');
const steps = [...form.querySelectorAll('.form-step')];
const dots = [...form.querySelectorAll('.steps span')];
const lines = [...form.querySelectorAll('.steps i')];
let currentStep = 1;
function showStep(number) {
  currentStep = number;
  steps.forEach(step => step.classList.toggle('active', Number(step.dataset.step) === number));
  dots.forEach((dot, i) => dot.classList.toggle('active', i < number));
  lines.forEach((line, i) => line.classList.toggle('active', i < number - 1));
}
form.querySelectorAll('.next-step').forEach(button => button.addEventListener('click', () => {
  if (currentStep === 1 && !form.objetivo.value) { form.querySelector('[data-step="1"] .form-error').textContent = 'Selecione um objetivo para continuar.'; return; }
  if (currentStep === 1) { form.querySelector('[data-step="1"] .form-error').textContent = ''; track('simulation_started', { objective: form.objetivo.value }); }
  showStep(Math.min(3, currentStep + 1));
}));
form.querySelectorAll('.prev-step').forEach(button => button.addEventListener('click', () => showStep(Math.max(1, currentStep - 1))));
const credit = form.querySelector('#credito');
const creditOutput = form.querySelector('#credit-output');
const currency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
credit.addEventListener('input', () => creditOutput.value = currency(credit.value));

const categoryMap = { imovel: 'Imóvel', automovel: 'Automóvel', pesado: 'Veículo pesado' };
document.querySelectorAll('[data-category]').forEach(link => link.addEventListener('click', () => {
  const category = link.dataset.category;
  const radio = [...form.querySelectorAll('[name="objetivo"]')].find(input => input.value === categoryMap[category]);
  if (radio) { radio.checked = true; showStep(1); }
  track(category === 'imovel' ? 'property_lead' : category === 'automovel' ? 'vehicle_lead' : 'heavy_vehicle_lead');
}));

const phoneMask = form.querySelector('#whatsapp');
phoneMask.addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  else if (v.length) v = `(${v}`;
  e.target.value = v;
});
form.addEventListener('submit', e => {
  e.preventDefault();
  const error = form.querySelector('[data-step="3"] .form-error');
  const name = form.nome.value.trim(); const phone = form.whatsapp.value.replace(/\D/g, '');
  if (form.website.value) return;
  if (name.length < 2) { error.textContent = 'Informe seu nome.'; form.nome.focus(); return; }
  if (phone.length < 10 || phone.length > 11) { error.textContent = 'Informe um WhatsApp válido com DDD.'; form.whatsapp.focus(); return; }
  error.textContent = '';
  const message = `Olá, Luciana! Fiz uma simulação pelo site.\nNome: ${name}\nObjetivo: ${form.objetivo.value}\nCrédito aproximado: ${currency(credit.value)}`;
  track('form_submit', { objective: form.objetivo.value, credit_value: Number(credit.value) }); track('simulation_completed', { objective: form.objetivo.value });
  window.location.href = waUrl(message);
});

document.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', () => { if (detail.open) track('faq_open', { question: detail.querySelector('summary').textContent.replace('+','').trim() }); }));
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
document.querySelector('#year').textContent = new Date().getFullYear();
