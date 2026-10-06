// ==========================================================================
// RXT PRODUCTIONS - LUXURY WEDDING QUOTATION PRESENTATION ENGINE
// Matches Sneha Wedding Quotation deck template (16 Landscape Slides)
// ==========================================================================

class QuotationEngine {
  constructor() {
    this.totalSlides = 16;
    this.currentSlideIndex = 0;
    this.cachedImages = {};
    this.activeClient = null;
    this.activeCalc = null;
  }

  // Preload image element from Base64 Data URI or path
  async loadImage(keyOrUrl) {
    if (this.cachedImages[keyOrUrl]) {
      return this.cachedImages[keyOrUrl];
    }

    // Check embedded Data URI table first
    let src = '';
    if (window.RXT_QUOTATION_SLIDES && window.RXT_QUOTATION_SLIDES[keyOrUrl]) {
      src = window.RXT_QUOTATION_SLIDES[keyOrUrl];
    } else if (typeof keyOrUrl === 'string' && keyOrUrl.startsWith('data:')) {
      src = keyOrUrl;
    } else {
      src = keyOrUrl;
    }

    return new Promise((resolve) => {
      const img = new Image();
      // Do NOT set crossOrigin on Data URIs or local assets to prevent CORS/file:// blocks
      img.onload = () => {
        this.cachedImages[keyOrUrl] = img;
        resolve(img);
      };
      img.onerror = (e) => {
        console.warn('Failed to load quotation slide:', keyOrUrl, e);
        resolve(null);
      };
      img.src = src;
    });
  }

  formatDate(dateStr) {
    if (!dateStr) return 'Dates To Be Finalized';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  }

  formatCurrency(num) {
    return Number(num || 0).toLocaleString('en-IN');
  }

  extractCity(address) {
    if (!address) return 'Bengaluru';
    const parts = address.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    return address;
  }

  drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false, strokeColor = '#000000') {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) {
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
  }

  // Render a specific slide into a canvas element for live interactive preview
  async renderSlideToCanvas(slideNum, client, calc, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 1440;
    canvas.height = 810;

    // Determine background asset key - use clean templates for all dynamic slides
    let bgKey = String(slideNum);
    if (slideNum === 4) bgKey = 'slide_4_bg';
    if (slideNum === 6) bgKey = 'slide_6_bg';
    if (slideNum === 7) bgKey = 'slide_7_bg';
    if (slideNum === 8) bgKey = 'slide_8_bg';
    if (slideNum === 9) bgKey = 'slide_9_bg';
    if (slideNum === 10) bgKey = 'slide_10_bg';

    let bgImg = await this.loadImage(bgKey);
    // Fallback to static slide key if bg variant not found
    if (!bgImg) {
      bgImg = await this.loadImage(String(slideNum));
    }

    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, 1440, 810);
    } else {
      ctx.fillStyle = '#141417';
      ctx.fillRect(0, 0, 1440, 810);
    }

    // Dynamic Slide Overlays
    if (slideNum === 4) {
      this.drawSlide4Details(ctx, client);
    } else if (slideNum === 6) {
      this.drawSlide6EventFlow(ctx, client);
    } else if (slideNum === 7) {
      this.drawSlide7Schedule(ctx, client);
    } else if (slideNum === 8) {
      this.drawSlide8Schedule(ctx, client);
    } else if (slideNum === 9) {
      this.drawSlide9Deliverables(ctx, client);
    } else if (slideNum === 10) {
      this.drawSlide10Pricing(ctx, calc);
    }
  }

  drawSlide4Details(ctx, client) {
    ctx.save();
    ctx.textAlign = 'left';

    // Title
    ctx.fillStyle = '#1e1e24';
    ctx.font = 'bold 44px "Times New Roman", serif';
    ctx.fillText('YOUR DETAILS', 170, 155);

    // Meta details
    ctx.font = '500 24px "Times New Roman", serif';
    ctx.fillStyle = '#222226';

    const clientName = client.name || 'Valued Couple';
    const eventType = client.eventName || 'Haladi & Wedding';
    const eventDate = this.formatDate(client.date);
    const place = client.place || this.extractCity(client.address);
    const venue = client.address || 'Selected Venue';
    const phone = client.phone || '';

    let y = 280;
    const lineHeight = 38;
    ctx.fillText(`Client Names : ${clientName}`, 90, y);
    y += lineHeight;
    ctx.fillText(`Event : ${eventType}`, 90, y);
    y += lineHeight;
    ctx.fillText(`Date : - ${eventDate}`, 90, y);
    y += lineHeight;
    ctx.fillText(`Place : - ${place}`, 90, y);
    y += lineHeight;
    ctx.fillText(`Venue : - ${venue}`, 90, y);
    y += lineHeight;
    ctx.fillText(`Contact : ${phone}`, 90, y);

    // Availability message
    ctx.font = 'normal 21px "Times New Roman", serif';
    ctx.fillStyle = '#333338';
    const msg = [
      'As per our conversation regarding the services you need, we are elated',
      'to let you know that we are available on the dates of your enquiry, please',
      'go through this quotation proposal in detail. Any doubts persist, please feel',
      'free to contact us on +91 8147417083, if you have any questions on the same.'
    ];

    let my = 535;
    msg.forEach(line => {
      ctx.fillText(line, 90, my);
      my += 34;
    });

    ctx.restore();
  }

  drawSlide6EventFlow(ctx, client) {
    ctx.save();

    // Subtitle & decorative heart
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a5568';
    ctx.font = '600 17px "Times New Roman", serif';
    ctx.fillText('CAPTURING OUR SPECIAL MOMENTS', 720, 148);

    ctx.fillStyle = '#b7791f';
    ctx.font = 'bold 16px "Times New Roman", serif';
    ctx.fillText('♥', 720, 168);

    // Calculate dates
    let day1Badge = 'Day 1 (Haladi & Pre-Wedding)';
    let day2Badge = 'Day 2 (Wedding & Reception)';

    if (client.date) {
      try {
        const d1 = new Date(client.date);
        const day1Num = d1.getDate();
        const month1 = d1.toLocaleDateString('en-IN', { month: 'short' });

        const d2 = new Date(client.date);
        d2.setDate(d2.getDate() + 1);
        const day2Num = d2.getDate();
        const month2 = d2.toLocaleDateString('en-IN', { month: 'short' });

        day1Badge = `${day1Num} ${month1} (Day 1)`;
        day2Badge = `${day2Num} ${month2} (Day 2)`;
      } catch (e) {
        // fallback
      }
    }

    const cardY = 195;
    const cardHeight = 555;
    const cardWidth = 470;
    const leftCardX = 225;
    const rightCardX = 745;

    // Left Card Background
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    this.drawRoundedRect(ctx, leftCardX, cardY, cardWidth, cardHeight, 16, true, true, '#e5e7eb');

    // Left Header Pill
    ctx.fillStyle = '#d5e2c7'; // soft sage
    this.drawRoundedRect(ctx, leftCardX + (cardWidth - 240) / 2, cardY + 20, 240, 44, 22, true, false);
    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 19px "Times New Roman", serif';
    ctx.fillText(day1Badge, leftCardX + cardWidth / 2, cardY + 48);

    // Left Timeline Vertical Line
    ctx.beginPath();
    ctx.moveTo(leftCardX + 50, cardY + 110);
    ctx.lineTo(leftCardX + 50, cardY + 490);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Day 1 Items
    const day1Events = [
      {
        time: '12:00 PM',
        bg: '#e0e7ff',
        title: 'Check-in & Gear Setup',
        desc: 'Bride and Groom check-in & venue walkthrough.'
      },
      {
        time: '04:30 PM',
        bg: '#fef3c7',
        title: 'Haladi Ceremony',
        desc: 'Auspicious Haladi rituals, family blessings & candid moments.'
      },
      {
        time: '07:30 PM',
        bg: '#fee2e2',
        title: 'Fun with Friends & Sangeet',
        desc: 'Evening light-hearted celebrations, sangeet & portraits.'
      }
    ];

    let itemY = cardY + 130;
    day1Events.forEach((ev) => {
      // Time bubble
      ctx.fillStyle = ev.bg;
      this.drawRoundedRect(ctx, leftCardX + 15, itemY - 22, 70, 32, 16, true, false);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText(ev.time, leftCardX + 50, itemY);

      // Text
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px "Times New Roman", serif';
      ctx.fillText(ev.title, leftCardX + 105, itemY - 6);

      ctx.fillStyle = '#475569';
      ctx.font = 'normal 15px "Times New Roman", serif';
      ctx.fillText(ev.desc, leftCardX + 105, itemY + 20);

      itemY += 125;
    });

    // Right Card Background
    ctx.fillStyle = '#ffffff';
    this.drawRoundedRect(ctx, rightCardX, cardY, cardWidth, cardHeight, 16, true, true, '#e5e7eb');

    // Right Header Pill
    ctx.fillStyle = '#fce2d8'; // soft blush
    this.drawRoundedRect(ctx, rightCardX + (cardWidth - 240) / 2, cardY + 20, 240, 44, 22, true, false);
    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 19px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(day2Badge, rightCardX + cardWidth / 2, cardY + 48);

    // Right Timeline Vertical Line
    ctx.beginPath();
    ctx.moveTo(rightCardX + 50, cardY + 110);
    ctx.lineTo(rightCardX + 50, cardY + 490);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Day 2 Items
    const day2Events = [
      {
        time: '09:30 AM',
        bg: '#dcfce7',
        title: 'Wedding Ceremony / Muhurtham',
        desc: 'Sacred wedding rituals, vows & auspicious mangalsutra ceremony.'
      },
      {
        time: '01:00 PM',
        bg: '#e0e7ff',
        title: 'Stage & Family Portraits',
        desc: 'Formal group photography with family members & blessed elders.'
      },
      {
        time: '06:30 PM',
        bg: '#fef3c7',
        title: 'Grand Evening Reception',
        desc: 'Couple grand entry, evening reception & celebratory cinema.'
      }
    ];

    itemY = cardY + 130;
    day2Events.forEach((ev) => {
      // Time bubble
      ctx.fillStyle = ev.bg;
      this.drawRoundedRect(ctx, rightCardX + 15, itemY - 22, 70, 32, 16, true, false);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText(ev.time, rightCardX + 50, itemY);

      // Text
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px "Times New Roman", serif';
      ctx.fillText(ev.title, rightCardX + 105, itemY - 6);

      ctx.fillStyle = '#475569';
      ctx.font = 'normal 15px "Times New Roman", serif';
      ctx.fillText(ev.desc, rightCardX + 105, itemY + 20);

      itemY += 125;
    });

    ctx.restore();
  }

  drawSlide7Schedule(ctx, client) {
    ctx.save();
    ctx.textAlign = 'center';

    // Day 1 Title
    ctx.fillStyle = '#1e1e24';
    ctx.font = 'bold 40px "Times New Roman", serif';
    ctx.fillText('Haladi / Pre-Wedding', 720, 175);

    ctx.font = '600 24px "Times New Roman", serif';
    ctx.fillStyle = '#3f3f46';
    ctx.fillText('Day 1 - Celebrations', 720, 235);

    ctx.font = 'bold 26px "Times New Roman", serif';
    ctx.fillStyle = '#1e1e24';
    ctx.fillText('Coverage & Team Allocation', 720, 315);

    // List of services
    ctx.font = '500 22px "Times New Roman", serif';
    ctx.fillStyle = '#222226';
    ctx.fillText('1 Senior Candid Photographer (Stills)', 720, 380);
    ctx.fillText('1 Senior Candid Cinematographer / Videographer', 720, 425);
    ctx.fillText('1 Dedicated Cinematic Gear & Audio Setup', 720, 470);

    if ((client.requirements || []).some(r => (r.name || '').toLowerCase().includes('drone'))) {
      ctx.fillText('1 4K Aerial Drone Coverage', 720, 515);
      ctx.fillText('Pre-Wedding Ceremony & Haladi Coverage', 720, 560);
    } else {
      ctx.fillText('Pre-Wedding Ceremony & Haladi Coverage', 720, 515);
    }

    ctx.restore();
  }

  drawSlide8Schedule(ctx, client) {
    ctx.save();
    ctx.textAlign = 'center';

    // Wedding Title
    ctx.fillStyle = '#1e1e24';
    ctx.font = 'bold 38px "Times New Roman", serif';
    ctx.fillText('Wedding & Reception', 720, 165);

    ctx.font = '600 24px "Times New Roman", serif';
    ctx.fillStyle = '#3f3f46';
    ctx.fillText('Day 2 - Main Celebrations', 720, 220);

    ctx.font = 'bold 24px "Times New Roman", serif';
    ctx.fillStyle = '#1e1e24';
    ctx.fillText('Selected Shoot Requirements & Team:', 720, 295);

    // Dynamic list of requirements
    const reqs = client.requirements || [];
    let y = 355;
    ctx.font = '500 22px "Times New Roman", serif';
    ctx.fillStyle = '#272730';

    if (reqs.length > 0) {
      reqs.forEach((r) => {
        if (y < 640) {
          ctx.fillText(`• ${r.name}`, 720, y);
          y += 42;
        }
      });
    } else {
      ctx.fillText('• 1 Senior Candid Photographer (Stills)', 720, 355);
      ctx.fillText('• 1 Senior Candid Cinematographer (Film)', 720, 395);
      ctx.fillText('• 1 Traditional Videographer for Wedding Vows', 720, 435);
      ctx.fillText('• Stage & Reception Full Coverage', 720, 475);
    }

    ctx.restore();
  }

  drawSlide9Deliverables(ctx, client) {
    ctx.save();
    ctx.textAlign = 'left';

    // Title
    ctx.fillStyle = '#1e1e24';
    ctx.font = 'bold 44px "Times New Roman", serif';
    ctx.fillText('DELIVERABLES :', 100, 115);

    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 17px "Times New Roman", serif';
    ctx.fillText('Tailored deliverables package based on selected shoot requirements', 105, 142);

    // Analyse requirements
    const reqs = client.requirements || [];
    const reqNames = reqs.map(r => (r.name || '').toLowerCase()).join(' ');

    const hasVideo = reqNames.includes('video') || reqNames.includes('film') || reqNames.includes('cinema') || reqs.length === 0;
    const hasTraditional = reqNames.includes('traditional');
    const hasAlbum = reqNames.includes('album') || reqNames.includes('book') || reqNames.includes('print');
    const hasDrone = reqNames.includes('drone') || reqNames.includes('aerial');

    let curY = 195;

    // SECTION 1: PHOTOGRAPHY
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 23px "Times New Roman", serif';
    ctx.fillText('1. High-Resolution Photographs', 105, curY);
    curY += 32;

    ctx.font = '500 19px "Times New Roman", serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('• 150+ Signature Colour Graded Pictures (Candid Format)', 125, curY);
    curY += 28;
    ctx.fillText('• Complete Colour Corrected High-Resolution Event Stills', 125, curY);
    curY += 28;
    ctx.fillText('• Private Online Cloud Gallery for Instant Family Viewing & Sharing', 125, curY);
    curY += 46;

    // SECTION 2: CINEMATOGRAPHY & VIDEO
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 23px "Times New Roman", serif';
    ctx.fillText('2. Cinematography & Video Films', 105, curY);
    curY += 32;

    ctx.font = '500 19px "Times New Roman", serif';
    ctx.fillStyle = '#334155';
    if (hasVideo) {
      ctx.fillText('• 1 Cinematic Wedding Highlight Film (3-5 Minutes 4K Teaser & Story)', 125, curY);
      curY += 28;
      ctx.fillText('• 1 Social Media Reel / Cinematic Teaser for Instagram (60 Seconds)', 125, curY);
      curY += 28;
      if (hasTraditional) {
        ctx.fillText('• 1 Full-Length Traditional Video with Full Ceremony Audio (Full HD)', 125, curY);
        curY += 28;
      }
    } else {
      ctx.fillText('• 1 Cinematic Wedding Highlight Reel of All Celebrations', 125, curY);
      curY += 28;
    }
    curY += 18;

    // SECTION 3: ALBUM & PRINTS
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 23px "Times New Roman", serif';
    ctx.fillText('3. Photobook Albums & Printing', 105, curY);
    curY += 32;

    ctx.font = '500 19px "Times New Roman", serif';
    ctx.fillStyle = '#334155';
    if (hasAlbum) {
      const albumReq = reqs.find(r => (r.name || '').toLowerCase().includes('album'));
      const albumTitle = albumReq ? albumReq.name : 'Premium Leatherette Photobook Album';
      ctx.fillText(`• 1 ${albumTitle} (40 Pages / 250+ Photos)`, 125, curY);
      curY += 28;
      ctx.fillText('• Matching Velvet Presentation Keepsake Box & Carrying Tote', 125, curY);
      curY += 28;
    } else {
      ctx.fillText('• Handcrafted Fine-Art Leatherette Photobook Albums available on request', 125, curY);
      curY += 28;
    }
    curY += 18;

    // SECTION 4: DELIVERY & TIMELINE
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 23px "Times New Roman", serif';
    ctx.fillText('4. Delivery Format & Timelines', 105, curY);
    curY += 32;

    ctx.font = '500 19px "Times New Roman", serif';
    ctx.fillStyle = '#334155';
    if (hasDrone) {
      ctx.fillText('• 4K Drone Aerial Cinematic Footage Included', 125, curY);
      curY += 28;
    }
    ctx.fillText('• High-Speed USB Pen Drive + Cloud Storage Access (1 Year Validity)', 125, curY);
    curY += 28;
    ctx.fillText('• Teaser in 10-14 Days | Final Edited Films & Albums in 30-45 Days', 125, curY);

    ctx.restore();
  }

  drawSlide10Pricing(ctx, calc) {
    ctx.save();
    ctx.textAlign = 'center';

    // Original Total Package (Crimson Red)
    ctx.fillStyle = '#c62828';
    ctx.font = 'bold 42px "Times New Roman", serif';
    ctx.fillText(`TOTAL PACKAGE- ${this.formatCurrency(calc.subtotal)}/-`, 720, 175);

    // Total Package After Discount (Emerald Green)
    if (calc.discountPercent > 0) {
      ctx.fillStyle = '#00843d';
      ctx.font = 'bold 46px "Times New Roman", serif';
      ctx.fillText(`TOTAL PACKAGE AFTER DISCOUNT- ${this.formatCurrency(calc.grandTotal)}/-`, 720, 240);
    } else {
      ctx.fillStyle = '#00843d';
      ctx.font = 'bold 44px "Times New Roman", serif';
      ctx.fillText(`TOTAL PACKAGE- ${this.formatCurrency(calc.grandTotal)}/-`, 720, 240);
    }

    ctx.restore();
  }

  // Generate the full 16-Slide PDF in 16:9 Landscape matching reference PDF
  async buildQuotationPdf(client, calc) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      throw new Error('PDF generator library not loaded.');
    }

    // 1440 x 810 pt = exact landscape 16:9 matching Sneha Wedding Quotation PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [1440, 810]
    });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1440;
    tempCanvas.height = 810;

    for (let slideNum = 1; slideNum <= this.totalSlides; slideNum++) {
      if (slideNum > 1) {
        doc.addPage([1440, 810], 'landscape');
      }

      await this.renderSlideToCanvas(slideNum, client, calc, tempCanvas);
      const imgData = tempCanvas.toDataURL('image/jpeg', 0.88);
      doc.addImage(imgData, 'JPEG', 0, 0, 1440, 810);
    }

    return doc;
  }

  async downloadQuotationPdf(client, calc) {
    const doc = await this.buildQuotationPdf(client, calc);
    const sanitizedName = (client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${sanitizedName}_Wedding_Quotation_RXT_Productions.pdf`;
    doc.save(filename);
    return filename;
  }

  async shareQuotationWhatsapp(client, calc) {
    const shareText = [
      `📸 *RXT PRODUCTIONS - WEDDING QUOTATION* 🎬`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👰 *Client:* ${client.name || 'Valued Couple'}`,
      `📅 *Date:* ${this.formatDate(client.date)}`,
      client.address ? `📍 *Venue:* ${client.address}` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `💵 *Total Package:* Rs. ${this.formatCurrency(calc.subtotal)}/-`,
      calc.discountPercent > 0 ? `🏷️ *Special Discount (${calc.discountPercent}%):* -Rs. ${this.formatCurrency(calc.discountAmount)}/-` : '',
      `✨ *FINAL QUOTED PACKAGE:* Rs. ${this.formatCurrency(calc.grandTotal)}/-`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `_Attached is our complete 16-slide Wedding Quotation Presentation Deck._`,
      `_We look forward to capturing your celebrations!_`
    ].filter(Boolean).join('\n');

    let fileShared = false;
    try {
      if (navigator.share && navigator.canShare) {
        const doc = await this.buildQuotationPdf(client, calc);
        const pdfBlob = doc.output('blob');
        const sanitizedName = (client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
        const file = new File([pdfBlob], `${sanitizedName}_Wedding_Quotation_RXT.pdf`, { type: 'application/pdf' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Wedding Quotation - ${client.name} - RXT Productions`,
            text: shareText,
            files: [file]
          });
          fileShared = true;
          return { method: 'web-share', success: true };
        }
      }
    } catch (e) {
      console.log('Web share skipped:', e);
    }

    if (!fileShared) {
      const cleanPhone = (client.phone || '').replace(/[^0-9]/g, '');
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`
        : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
      return { method: 'whatsapp-direct', success: true };
    }
  }
}

window.QuotationEngine = QuotationEngine;
