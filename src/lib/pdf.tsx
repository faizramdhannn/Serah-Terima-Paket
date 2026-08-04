import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export type PdfItem = {
  noOrder: string;
  resi: string;
  ekspedisi: string;
  warehouse: string;
  channel: string;
  service: string;
};

const TORCH_LOGO_URL = "https://lh3.googleusercontent.com/d/1G1lSqUUAmpxpJUKcklF_y9jh-ZkmNY8E";
const TORCH_TEAL = "#0f9b8e";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 7.5, fontFamily: "Times-Roman" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `2px solid ${TORCH_TEAL}`,
    paddingBottom: 6,
    marginBottom: 8,
  },
  logo: { width: 70, height: 28, objectFit: "contain" },
  title: { fontSize: 12, fontFamily: "Times-Bold", textAlign: "right", color: "#0f172a" },
  subtitle: { fontSize: 8, color: "#4b5563", textAlign: "right", marginTop: 2 },
  infoBox: {
    backgroundColor: "#f0fdfb",
    border: "1px solid #ccfbf1",
    borderRadius: 3,
    padding: 5,
    marginBottom: 8,
  },
  infoText: { fontSize: 8 },
  groupTitle: {
    fontSize: 9,
    fontFamily: "Times-Bold",
    color: "#0f172a",
    borderBottom: "1px solid #9ca3af",
    padding: 3,
    marginTop: 6,
    marginBottom: 2,
  },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f3f4f6" },
  row: { flexDirection: "row", borderBottom: "1px solid #e5e7eb" },
  cellNo: { width: "5%", padding: 2 },
  cellOrder: { width: "17%", padding: 2 },
  cellResi: { width: "19%", padding: 2 },
  cellChannel: { width: "25%", padding: 2, fontSize: 6.5 },
  cellService: { width: "10%", padding: 2 },
  cellWh: { width: "24%", padding: 2 },
  headerCell: { fontFamily: "Times-Bold" },
  signaturesWrap: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    flexWrap: "wrap",
  },
  sigBox: { width: "25%", textAlign: "center", paddingHorizontal: 4, marginBottom: 12 },
  sigLabel: { fontSize: 8 },
  sigName: { fontSize: 8, fontFamily: "Times-Bold", marginBottom: 26 },
  sigLine: {
    borderTop: "1px solid #6b7280",
    marginHorizontal: 6,
    paddingTop: 2,
    fontSize: 7,
    color: "#4b5563",
  },
  footer: { marginTop: 12, fontSize: 7, color: "#6b7280" },
});

export function ReceiptDocument({
  items,
  docNo,
  generatedAt,
}: {
  items: PdfItem[];
  docNo: string;
  generatedAt: string;
}) {
  const groups = new Map<string, PdfItem[]>();
  for (const item of items) {
    const list = groups.get(item.ekspedisi) ?? [];
    list.push(item);
    groups.set(item.ekspedisi, list);
  }
  const ekspedisiNames = Array.from(groups.keys());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={styles.logo} src={TORCH_LOGO_URL} />
          <View>
            <Text style={styles.title}>BERITA ACARA SERAH TERIMA</Text>
            <Text style={styles.subtitle}>No: {docNo}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Tanggal Cetak: {generatedAt}</Text>
          <Text style={styles.infoText}>Total Paket: {items.length} Paket</Text>
        </View>

        {Array.from(groups.entries()).map(([ekspedisi, group]) => (
          <View key={ekspedisi} wrap={false}>
            <Text style={styles.groupTitle}>
              {ekspedisi} ({group.length} resi)
            </Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.cellNo, styles.headerCell]}>No</Text>
              <Text style={[styles.cellOrder, styles.headerCell]}>No Order</Text>
              <Text style={[styles.cellResi, styles.headerCell]}>Resi</Text>
              <Text style={[styles.cellChannel, styles.headerCell]}>Channel</Text>
              <Text style={[styles.cellService, styles.headerCell]}>Servis</Text>
              <Text style={[styles.cellWh, styles.headerCell]}>Warehouse</Text>
            </View>
            {group.map((item, idx) => (
              <View style={styles.row} key={item.resi}>
                <Text style={styles.cellNo}>{idx + 1}</Text>
                <Text style={styles.cellOrder}>{item.noOrder || "-"}</Text>
                <Text style={styles.cellResi}>{item.resi}</Text>
                <Text style={styles.cellChannel}>{item.channel || "-"}</Text>
                <Text style={styles.cellService}>{item.service || "-"}</Text>
                <Text style={styles.cellWh}>{item.warehouse || "-"}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.signaturesWrap} wrap={false}>
          <View style={styles.sigBox}>
            <Text style={styles.sigLabel}>Diserahkan Oleh,</Text>
            <Text style={styles.sigName}>Tim Packing / Gudang</Text>
            <Text style={styles.sigLine}>Staff Gudang</Text>
          </View>
          {ekspedisiNames.map((name) => (
            <View style={styles.sigBox} key={name}>
              <Text style={styles.sigLabel}>Diterima Oleh,</Text>
              <Text style={styles.sigName}>Kurir {name}</Text>
              <Text style={styles.sigLine}>Nama & No. HP Driver</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Dokumen digenerate otomatis dari sistem scan resi. Setiap serah terima wajib
          didokumentasikan (foto bersama bukti fisik paket).
        </Text>
      </Page>
    </Document>
  );
}

export async function buildReceiptPdf(items: PdfItem[], docNo: string): Promise<Buffer> {
  const generatedAt = new Date().toLocaleString("id-ID");
  return renderToBuffer(<ReceiptDocument items={items} docNo={docNo} generatedAt={generatedAt} />);
}
