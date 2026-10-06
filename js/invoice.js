// RXT Productions - Dynamic Invoicing & PDF Generation Engine

class InvoiceEngine {
  constructor() {
    this.company = {
      name: 'RXT PRODUCTIONS',
      tagline: 'PHOTOGRAPHY • CINEMA • EVENTS',
      phone: '+91 81474 17083',
      email: 'rxtproduction07@gmail.com'
    };
  }

  calculate(requirements = [], discountPercent = 0, advancePaid = 0) {
    const validReqs = (requirements || []).map((req, idx) => {
      const price = Math.max(0, Number(req.price) || 0);
      const qty = Math.max(1, Number(req.qty) || 1);
      return {
        id: req.id || `item_${idx}`,
        name: req.name || 'Photography Service',
        category: req.category || 'Package',
        price: price,
        qty: qty,
        total: price * qty
      };
    });

    const subtotal = validReqs.reduce((sum, item) => sum + item.total, 0);
    const discountPct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    const discountAmount = Math.round((subtotal * discountPct) / 100);
    const grandTotal = Math.max(0, subtotal - discountAmount);
    const advance = Math.min(grandTotal, Math.max(0, Number(advancePaid) || 0));
    const balanceDue = Math.max(0, grandTotal - advance);

    return {
      items: validReqs,
      subtotal,
      discountPercent: discountPct,
      discountAmount,
      grandTotal,
      advancePaid: advance,
      balanceDue
    };
  }

  formatCurrency(amount) {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  }

  generateHtmlPreview(client, calcData) {
    const itemsRows = calcData.items.map((item, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>
          <strong style="color: #ffffff;">${this.escapeHtml(item.name)}</strong>
          <span style="display:block; font-size:0.7rem; color:var(--text-muted);">${this.escapeHtml(item.category)}</span>
        </td>
        <td class="text-center">${item.qty}</td>
        <td class="text-right">${this.formatCurrency(item.price)}</td>
        <td class="text-right"><strong style="color:var(--gold-primary);">${this.formatCurrency(item.total)}</strong></td>
      </tr>
    `).join('');

    const invoiceNo = 'RXT-' + (client.id ? String(client.id).slice(-6) : Date.now().toString().slice(-6));
    const eventDate = client.date ? new Date(client.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'To Be Scheduled';
    const issueDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <div class="invoice-paper" id="invoice-render-box">
        <div class="invoice-paper-header">
          <div class="inv-brand-left">
            <img src="./assets/logo.svg" alt="RXT Productions" class="inv-logo-img" onerror="this.style.display='none'">
            <div>
              <div class="inv-title">RXT PRODUCTIONS</div>
              <div class="inv-sub">CINEMA & PHOTOGRAPHY STUDIO</div>
            </div>
          </div>
          <div class="inv-meta-right">
            <div>BILL</div>
            <div><strong>#${invoiceNo}</strong></div>
            <div style="margin-top:4px;">Date: ${issueDate}</div>
            <div style="color:var(--gold-primary);">Event: <strong>${eventDate}</strong></div>
          </div>
        </div>

        <div class="inv-client-box">
          <h4>CLIENT DETAILS</h4>
          <div style="display:grid; grid-template-columns: 1fr; gap:3px;">
            <div>Name: <strong style="color:#ffffff;">${this.escapeHtml(client.name || 'Valued Client')}</strong></div>
            <div>Phone: <a href="tel:${encodeURIComponent(client.phone || '')}" style="color:var(--info-cyan); text-decoration:none;">${this.escapeHtml(client.phone || 'N/A')}</a></div>
            ${client.address ? `<div>Venue / Address: <span style="color:#d4d4d8;">${this.escapeHtml(client.address)}</span></div>` : ''}
          </div>
        </div>

        <table class="inv-table">
          <thead>
            <tr>
              <th style="width: 32px;" class="text-center">#</th>
              <th>Requirement Description</th>
              <th style="width: 44px;" class="text-center">Qty</th>
              <th style="width: 80px;" class="text-right">Rate</th>
              <th style="width: 86px;" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows || '<tr><td colspan="5" class="text-center" style="padding:16px; color:var(--text-dim);">No requirements selected yet.</td></tr>'}
          </tbody>
        </table>

        <div class="inv-summary-table">
          <div class="inv-summary-row">
            <span>Subtotal:</span>
            <span>${this.formatCurrency(calcData.subtotal)}</span>
          </div>
          ${calcData.discountPercent > 0 ? `
            <div class="inv-summary-row" style="color:#34d399;">
              <span>Discount (${calcData.discountPercent}%):</span>
              <span>- ${this.formatCurrency(calcData.discountAmount)}</span>
            </div>
          ` : ''}
          <div class="inv-summary-row total">
            <span>GRAND TOTAL:</span>
            <span>${this.formatCurrency(calcData.grandTotal)}</span>
          </div>
          ${calcData.advancePaid > 0 ? `
            <div class="inv-summary-row" style="color:var(--info-cyan); font-size:0.75rem; margin-top:4px;">
              <span>Advance Paid:</span>
              <span>${this.formatCurrency(calcData.advancePaid)}</span>
            </div>
            <div class="inv-summary-row" style="color:#ff8888; font-weight:700;">
              <span>Balance Due:</span>
              <span>${this.formatCurrency(calcData.balanceDue)}</span>
            </div>
          ` : ''}
        </div>

        <div style="margin-top:18px; padding-top:10px; border-top:1px solid #202026; font-size:0.68rem; color:var(--text-dim); text-align:center;">
          Thank you for choosing RXT Productions to capture your unforgettable moments!
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async buildPdfDocument(client, calcData) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      throw new Error('PDF generator library not loaded. Please ensure jspdf.umd.min.js is available.');
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Dark sleek invoice header box
    doc.setFillColor(15, 15, 20);
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Accent gold header bar
    doc.setFillColor(245, 197, 24);
    doc.rect(0, 42, pageWidth, 2, 'F');

    // Studio Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(245, 197, 24);
    doc.text('RXT PRODUCTIONS', margin, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 210);
    doc.text('PHOTOGRAPHY  •  CINEMATOGRAPHY  •  EVENTS', margin, 25);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 155);
    doc.text('Capture the Unforgettable Moments', margin, 31);

    // Meta details right side
    const invoiceNo = 'RXT-' + (client.id ? String(client.id).slice(-6) : Date.now().toString().slice(-6));
    const issueDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const eventDate = client.date ? new Date(client.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'To Be Scheduled';

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('BILL', pageWidth - margin, 16, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(245, 197, 24);
    doc.text(`Invoice #${invoiceNo}`, pageWidth - margin, 24, { align: 'right' });
    doc.setTextColor(180, 180, 195);
    doc.text(`Issue Date: ${issueDate}`, pageWidth - margin, 30, { align: 'right' });
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`Shoot Date: ${eventDate}`, pageWidth - margin, 36, { align: 'right' });

    // Client Information Section
    let currentY = 52;
    doc.setFillColor(245, 245, 248);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 24, 2, 2, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 130);
    doc.text('BILLED TO:', margin + 4, currentY + 6);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 25);
    doc.text(client.name || 'Client', margin + 4, currentY + 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 70);
    doc.text(`Phone: ${client.phone || 'N/A'}`, margin + 4, currentY + 18);

    if (client.address) {
      doc.text(`Venue / Address: ${client.address}`, margin + 80, currentY + 18);
    }

    currentY += 30;

    // Tabular Breakdown using AutoTable
    const tableRows = calcData.items.map((item, idx) => [
      idx + 1,
      `${item.name}\n[${item.category}]`,
      item.qty,
      `Rs. ${Number(item.price).toLocaleString('en-IN')}`,
      `Rs. ${Number(item.total).toLocaleString('en-IN')}`
    ]);

    doc.autoTable({
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Requirement / Service Description', 'Qty', 'Rate', 'Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [20, 20, 26],
        textColor: [245, 197, 24],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 3.5
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [30, 30, 35],
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
      },
      styles: {
        lineColor: [220, 220, 230],
        lineWidth: 0.2
      }
    });

    const finalY = doc.lastAutoTable.finalY + 8;

    // Totals Box (Right aligned)
    const summaryWidth = 78;
    const summaryX = pageWidth - margin - summaryWidth;
    let sumY = finalY;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 80);
    doc.text('Subtotal:', summaryX, sumY);
    doc.text(`Rs. ${calcData.subtotal.toLocaleString('en-IN')}`, pageWidth - margin, sumY, { align: 'right' });

    if (calcData.discountPercent > 0) {
      sumY += 6;
      doc.setTextColor(16, 185, 129);
      doc.text(`Discount (${calcData.discountPercent}%):`, summaryX, sumY);
      doc.text(`- Rs. ${calcData.discountAmount.toLocaleString('en-IN')}`, pageWidth - margin, sumY, { align: 'right' });
    }

    sumY += 8;
    // Grand Total Bar
    doc.setFillColor(20, 20, 26);
    doc.rect(summaryX - 4, sumY - 5, summaryWidth + 4, 10, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 197, 24);
    doc.text('GRAND TOTAL:', summaryX, sumY + 2);
    doc.text(`Rs. ${calcData.grandTotal.toLocaleString('en-IN')}`, pageWidth - margin, sumY + 2, { align: 'right' });

    if (calcData.advancePaid > 0) {
      sumY += 12;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(6, 182, 212);
      doc.text('Advance Paid:', summaryX, sumY);
      doc.text(`Rs. ${calcData.advancePaid.toLocaleString('en-IN')}`, pageWidth - margin, sumY, { align: 'right' });

      sumY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('Balance Due:', summaryX, sumY);
      doc.text(`Rs. ${calcData.balanceDue.toLocaleString('en-IN')}`, pageWidth - margin, sumY, { align: 'right' });
    }

    // Terms & Conditions / Signature Footer
    const footerY = 270;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 110);
    doc.text('Terms & Booking Notes:', margin, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 140);
    doc.text('• Dates are officially reserved upon confirmation of initial booking advance.', margin, footerY + 5);
    doc.text('• Raw and edited deliverables timeline is subject to event schedule.', margin, footerY + 9);
    doc.text('• For questions or adjustments, contact RXT Productions support.', margin, footerY + 13);

    // Bottom Decorative Bar
    doc.setFillColor(245, 197, 24);
    doc.rect(0, 290, pageWidth, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('RXT PRODUCTIONS  •  PHOTOGRAPHY & CINEMATOGRAPHY', pageWidth / 2, 294.5, { align: 'center' });

    return doc;
  }

  async downloadPdf(client, calcData) {
    const doc = await this.buildPdfDocument(client, calcData);
    const sanitizedName = (client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `RXT_Bill_${sanitizedName}.pdf`;
    doc.save(filename);
    return filename;
  }

  async shareOnWhatsapp(client, calcData) {
    // 1. Generate text billing summary for WhatsApp
    const lines = [
      `🧾 *RXT PRODUCTIONS - BILL & INVOICE* 📸`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Client:* ${client.name || 'Valued Client'}`,
      `📅 *Event Date:* ${client.date || 'TBD'}`,
      client.address ? `📍 *Venue:* ${client.address}` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `📋 *REQUIREMENTS & PACKAGES:*`
    ].filter(Boolean);

    calcData.items.forEach((item, idx) => {
      lines.push(`${idx + 1}. *${item.name}* (x${item.qty}) - ${this.formatCurrency(item.total)}`);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`💵 *Subtotal:* ${this.formatCurrency(calcData.subtotal)}`);
    if (calcData.discountPercent > 0) {
      lines.push(`🏷️ *Discount (${calcData.discountPercent}%):* -${this.formatCurrency(calcData.discountAmount)}`);
    }
    lines.push(`✨ *GRAND TOTAL:* ${this.formatCurrency(calcData.grandTotal)}`);

    if (calcData.advancePaid > 0) {
      lines.push(`💳 *Advance Paid:* ${this.formatCurrency(calcData.advancePaid)}`);
      lines.push(`⏳ *Balance Due:* ${this.formatCurrency(calcData.balanceDue)}`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`_Thank you for choosing RXT Productions!_`);

    const shareText = lines.join('\n');

    // 2. Attempt Web Share API with File if supported
    let fileShared = false;
    try {
      if (navigator.share && navigator.canShare) {
        const doc = await this.buildPdfDocument(client, calcData);
        const pdfBlob = doc.output('blob');
        const sanitizedName = (client.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
        const file = new File([pdfBlob], `RXT_Invoice_${sanitizedName}.pdf`, { type: 'application/pdf' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `RXT Productions Quotation - ${client.name}`,
            text: shareText,
            files: [file]
          });
          fileShared = true;
          return { method: 'web-share', success: true };
        }
      }
    } catch (shareErr) {
      console.log('Web share API cancelled or skipped:', shareErr);
    }

    // 3. Fallback or direct WhatsApp Web / App link
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

window.InvoiceEngine = InvoiceEngine;
