// Carousel uses image thumbnails; clicking opens modal with full image.
let currentStartIndex = 0;
let isAnimating = false;

function updateCarousel() {
    const carousel = document.getElementById('pdf-carousel');
    // ensure transform is in a consistent state
    carousel.style.transform = `translateX(-${currentStartIndex * 0}px)`;
}

function nextCert() {
    if (isAnimating) return Promise.resolve();
    const carousel = document.getElementById('pdf-carousel');
    const firstItem = carousel.querySelector('.pdf-item');
    if (!firstItem) return Promise.resolve();
    const itemRect = firstItem.getBoundingClientRect();
    const style = getComputedStyle(carousel);
    const gap = parseFloat(style.gap) || 24;
    const move = itemRect.width + gap;

    return new Promise((resolve) => {
        isAnimating = true;
        // animate left by one item
        carousel.style.transition = 'transform 0.5s ease';
        carousel.style.transform = `translateX(-${move}px)`;

        function onEnd() {
            carousel.removeEventListener('transitionend', onEnd);
            // move first element to the end
            const first = carousel.children[0];
            carousel.appendChild(first);
            // reset transform without animation
            carousel.style.transition = 'none';
            carousel.style.transform = 'translateX(0)';
            // force reflow then re-enable transition
            void carousel.offsetWidth;
            carousel.style.transition = '';
            isAnimating = false;
            refreshCenterAndIndicators();
            resolve();
        }

        carousel.addEventListener('transitionend', onEnd);
    });
}

function prevCert() {
    if (isAnimating) return Promise.resolve();
    const carousel = document.getElementById('pdf-carousel');
    const items = carousel.children;
    if (!items.length) return Promise.resolve();
    const firstItem = carousel.querySelector('.pdf-item');
    const itemRect = firstItem.getBoundingClientRect();
    const style = getComputedStyle(carousel);
    const gap = parseFloat(style.gap) || 24;
    const move = itemRect.width + gap;

    return new Promise((resolve) => {
        isAnimating = true;
        // move last element to the front immediately
        const last = carousel.children[carousel.children.length - 1];
        carousel.insertBefore(last, carousel.children[0]);
        // jump left to show that last item off-screen
        carousel.style.transition = 'none';
        carousel.style.transform = `translateX(-${move}px)`;
        // force reflow then animate back to 0
        void carousel.offsetWidth;
        carousel.style.transition = 'transform 0.5s ease';
        carousel.style.transform = 'translateX(0)';

        function onPrevEnd() {
            carousel.removeEventListener('transitionend', onPrevEnd);
            isAnimating = false;
            refreshCenterAndIndicators();
            resolve();
        }

        carousel.addEventListener('transitionend', onPrevEnd);
    });
}

function openModal(el) {
    // el is the clicked .pdf-item element
    const img = el.querySelector('img');
    if (!img) return;
    const fullSrc = img.dataset.full || img.src;
    const modalImage = document.getElementById('pdf-modal-image');
    modalImage.src = fullSrc;
    const modal = document.getElementById('pdf-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(event) {
    if (event && event.target.id !== 'pdf-modal') return;
    const modal = document.getElementById('pdf-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') nextCert();
    if (e.key === 'ArrowLeft') prevCert();
    if (e.key === 'Escape') closeModal();
});

// initialize after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    updateCarousel();
    // initial refresh
    refreshCenterAndIndicators();
});

function refreshCenterAndIndicators() {
    const carousel = document.getElementById('pdf-carousel');
    if (!carousel) return;
    // clear center class
    Array.from(carousel.querySelectorAll('.pdf-item')).forEach(item => item.classList.remove('center'));
    // center is the second visible item (index 1)
    const centerItem = carousel.children[1];
    if (centerItem) centerItem.classList.add('center');

    // update indicators based on data-id of centerItem
    const centerId = centerItem ? centerItem.getAttribute('data-id') : null;
    document.querySelectorAll('.carousel-indicator').forEach(ind => {
        ind.classList.toggle('active', ind.getAttribute('data-id') === centerId);
    });
}

async function goToCert(targetId) {
    const carousel = document.getElementById('pdf-carousel');
    const items = Array.from(carousel.children);
    if (!items.length) return;
    // find current center index (we treat children[1] as center)
    const center = carousel.children[1];
    const len = items.length;
    let centerPos = items.indexOf(center);
    if (centerPos === -1) centerPos = 0;
    // find position of targetId
    const targetPos = items.findIndex(i => i.getAttribute('data-id') === String(targetId));
    if (targetPos === -1) return;
    // compute minimal steps (positive = forward, negative = backward)
    let delta = (targetPos - centerPos + len) % len;
    if (delta > len / 2) delta = delta - len; // go backwards

    // perform steps sequentially, awaiting each animation
    if (delta > 0) {
        for (let i = 0; i < delta; i++) {
            await nextCert();
        }
    } else if (delta < 0) {
        for (let i = 0; i < Math.abs(delta); i++) {
            await prevCert();
        }
    }
    refreshCenterAndIndicators();
}

