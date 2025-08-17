// ==UserScript==
// @name         Pixel Regeneration Full Timer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Показывает полный таймер регенерации всех пикселей
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Конфигурация
    const CONFIG = {
        PIXEL_REGEN_TIME: 30, // секунд на один пиксель
        UPDATE_INTERVAL: 1000, // обновление каждую секунду
        SELECTOR: '.btn.btn-primary.btn-lg.sm\\:btn-xl', // селектор кнопки
        MAX_PIXELS: 100 // максимальное количество пикселей (можно настроить)
    };

    let timerInterval = null;
    let fullTimerElement = null;
    let isInitialized = false;

    // Функция для безопасного парсинга времени
    function parseTimeString(timeStr) {
        if (!timeStr) return 0;
        
        const match = timeStr.match(/\((\d+):(\d+)\)/);
        if (!match) return 0;
        
        const minutes = parseInt(match[1], 10) || 0;
        const seconds = parseInt(match[2], 10) || 0;
        return minutes * 60 + seconds;
    }

    // Функция для форматирования времени
    function formatTime(totalSeconds) {
        if (totalSeconds <= 0) return '0:00';
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Функция для получения количества доступных пикселей из canvas
    function getAvailablePixels() {
        try {
            const canvas = document.querySelector('canvas[width="77"][height="19"]');
            if (!canvas) return 0;
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Простой подсчет "заполненных" пикселей на основе альфа-канала
            let filledPixels = 0;
            for (let i = 3; i < imageData.data.length; i += 4) {
                if (imageData.data[i] > 128) { // альфа > 128 считаем заполненным
                    filledPixels++;
                }
            }
            
            // Примерное соотношение заполненности к количеству доступных пикселей
            return Math.floor((filledPixels / (canvas.width * canvas.height)) * CONFIG.MAX_PIXELS);
        } catch (error) {
            console.warn('Ошибка при чтении canvas:', error);
            return 0;
        }
    }

    // Функция для вычисления полного времени регенерации
    function calculateFullRegenTime() {
        const currentPixelTimeStr = document.querySelector('.w-7.text-xs')?.textContent;
        const currentPixelTime = parseTimeString(currentPixelTimeStr);
        
        if (currentPixelTime === 0) return 0; // Уже полная регенерация
        
        const availablePixels = getAvailablePixels();
        const missingPixels = CONFIG.MAX_PIXELS - availablePixels;
        
        if (missingPixels <= 0) return 0;
        
        // Время = время до следующего пикселя + (количество недостающих пикселей - 1) * 30 секунд
        return currentPixelTime + (missingPixels - 1) * CONFIG.PIXEL_REGEN_TIME;
    }

    // Функция для создания элемента полного таймера
    function createFullTimerElement() {
        const timerDiv = document.createElement('div');
        timerDiv.id = 'full-pixel-timer';
        timerDiv.className = 'absolute bottom-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-mono z-40';
        timerDiv.style.cssText = `
            position: fixed !important;
            bottom: 60px !important;
            right: 20px !important;
            background: rgba(0, 0, 0, 0.8) !important;
            color: #fff !important;
            padding: 8px 12px !important;
            border-radius: 6px !important;
            font-family: monospace !important;
            font-size: 14px !important;
            z-index: 9999 !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            backdrop-filter: blur(4px) !important;
            pointer-events: none !important;
        `;
        timerDiv.innerHTML = 'Full: --:--';
        return timerDiv;
    }

    // Функция обновления таймера
    function updateTimer() {
        if (!fullTimerElement) return;
        
        try {
            const fullTime = calculateFullRegenTime();
            fullTimerElement.innerHTML = `Full: ${formatTime(fullTime)}`;
            
            // Скрыть таймер если регенерация завершена
            if (fullTime === 0) {
                fullTimerElement.style.display = 'none';
            } else {
                fullTimerElement.style.display = 'block';
            }
        } catch (error) {
            console.warn('Ошибка при обновлении таймера:', error);
            fullTimerElement.innerHTML = 'Full: Error';
        }
    }

    // Функция инициализации
    function initialize() {
        if (isInitialized) return;
        
        const paintButton = document.querySelector(CONFIG.SELECTOR);
        if (!paintButton) return;
        
        // Создание элемента таймера
        fullTimerElement = createFullTimerElement();
        document.body.appendChild(fullTimerElement);
        
        // Запуск таймера
        timerInterval = setInterval(updateTimer, CONFIG.UPDATE_INTERVAL);
        updateTimer(); // Первое обновление
        
        isInitialized = true;
        console.log('Pixel Regeneration Full Timer инициализирован');
    }

    // Функция очистки
    function cleanup() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        if (fullTimerElement) {
            fullTimerElement.remove();
            fullTimerElement = null;
        }
        
        isInitialized = false;
    }

    // Ожидание загрузки DOM
    function waitForDOM() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
        
        // Дополнительная проверка через MutationObserver для динамического контента
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                }
            });
            
            if (shouldCheck && !isInitialized) {
                // Задержка для предотвращения частых проверок
                setTimeout(() => {
                    if (!isInitialized) {
                        initialize();
                    }
                }, 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Обработка видимости страницы для оптимизации производительности
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Замедляем обновления когда страница не видна
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = setInterval(updateTimer, CONFIG.UPDATE_INTERVAL * 5);
            }
        } else {
            // Восстанавливаем нормальную частоту обновлений
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = setInterval(updateTimer, CONFIG.UPDATE_INTERVAL);
            }
        }
    });

    // Очистка при выгрузке страницы
    window.addEventListener('beforeunload', cleanup);
    
    // Запуск скрипта
    waitForDOM();
})();
