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

document.querySelectorAll('[data-category]').forEach(link => link.addEventListener('click', () => {
  const category = link.dataset.category;
  track(category === 'imovel' ? 'property_lead' : category === 'automovel' ? 'vehicle_lead' : 'heavy_vehicle_lead');
}));

function animateDetail(detail, shouldOpen) {
  if (detail.dataset.animating === 'true') return;
  detail.dataset.animating = 'true';
  const summary = detail.querySelector('summary');
  const startHeight = detail.offsetHeight;
  if (shouldOpen) detail.open = true;
  const endHeight = shouldOpen ? detail.scrollHeight : summary.offsetHeight;
  const animation = detail.animate({ height: [`${startHeight}px`, `${endHeight}px`] }, { duration: 300, easing: 'ease-in-out' });
  animation.onfinish = () => {
    if (!shouldOpen) detail.open = false;
    detail.style.height = '';
    delete detail.dataset.animating;
  };
}
document.querySelectorAll('.accordion details').forEach(detail => {
  detail.querySelector('summary').addEventListener('click', event => {
    event.preventDefault();
    const shouldOpen = !detail.open;
    document.querySelectorAll('.accordion details[open]').forEach(other => { if (other !== detail) animateDetail(other, false); });
    animateDetail(detail, shouldOpen);
    if (shouldOpen) track('faq_open', { question: detail.querySelector('summary').textContent.replace('+','').trim() });
  });
});
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
document.querySelector('#year').textContent = new Date().getFullYear();
