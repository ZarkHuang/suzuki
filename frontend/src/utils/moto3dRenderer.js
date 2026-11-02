/**
 * 3D Suzuki SUI 125 Digital Showroom Renderer (WebGL)
 * 專為 Suzuki SUI 125 打造的 3D 數位展示台引擎
 * 1:1 還原 SUI 125 經典 K-Car 方圓頭燈、貫穿式前方向燈飾條、寬體鴨嘴前土除、
 * 前輪銀色打孔碟盤、寬敞平踏板、方正復古車尾、橫向矩陣尾燈、傳動箱與黑色防燙蓋排氣管
 */

export const MOTO_COLOR_THEMES = {
  sui_black: {
    id: 'sui_black',
    name: '魚子醬黑 (我的愛車)',
    badgeColor: '#1E293B',
    body: [0.09, 0.10, 0.12],       // 魚子醬亮黑烤漆車殼 (提高高光反射呈現鏡面黑質感)
    bodyRoughness: 0.14,
    bodyMetallic: 0.32,
    seat: [0.15, 0.16, 0.18],       // 黑色厚實坐墊
    innerPlastic: [0.12, 0.13, 0.15], // 消光黑內裝與平踏板
    rim: [0.08, 0.09, 0.11]
  },
  sui_parmesan: {
    id: 'sui_parmesan',
    name: '帕瑪森白',
    badgeColor: '#E5DCCB',
    body: [0.87, 0.82, 0.72],       // 帕瑪森奶油米白
    bodyRoughness: 0.22,
    bodyMetallic: 0.10,
    seat: [0.46, 0.26, 0.16],       // 復古棕色坐墊
    innerPlastic: [0.13, 0.14, 0.16],
    rim: [0.09, 0.10, 0.12]
  },
  sui_yellow: {
    id: 'sui_yellow',
    name: '翻糖黃',
    badgeColor: '#D4C35D',
    body: [0.80, 0.74, 0.34],       // 翻糖芥末黃
    bodyRoughness: 0.22,
    bodyMetallic: 0.10,
    seat: [0.15, 0.16, 0.18],       // 黑色坐墊
    innerPlastic: [0.13, 0.14, 0.16],
    rim: [0.09, 0.10, 0.12]
  },
  sui_soda: {
    id: 'sui_soda',
    name: '蘇打藍',
    badgeColor: '#76B4D0',
    body: [0.44, 0.70, 0.82],       // 蘇打汽水藍
    bodyRoughness: 0.22,
    bodyMetallic: 0.12,
    seat: [0.15, 0.16, 0.18],
    innerPlastic: [0.13, 0.14, 0.16],
    rim: [0.09, 0.10, 0.12]
  },
  sui_red: {
    id: 'sui_red',
    name: '醋栗紅',
    badgeColor: '#B91C1C',
    body: [0.72, 0.14, 0.16],       // 醋栗復古紅
    bodyRoughness: 0.20,
    bodyMetallic: 0.18,
    seat: [0.15, 0.16, 0.18],
    innerPlastic: [0.13, 0.14, 0.16],
    rim: [0.09, 0.10, 0.12]
  }
}

// ─── 基礎矩陣與向量運算 ──────────────────────────────────────────────
function mat4Identity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ])
}

function mat4Multiply(a, b) {
  const out = new Float32Array(16)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[0 * 4 + r] * b[c * 4 + 0] +
        a[1 * 4 + r] * b[c * 4 + 1] +
        a[2 * 4 + r] * b[c * 4 + 2] +
        a[3 * 4 + r] * b[c * 4 + 3]
    }
  }
  return out
}

function mat4Perspective(fovyRad, aspect, near, far) {
  const f = 1.0 / Math.tan(fovyRad / 2)
  const nf = 1 / (near - far)
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ])
}

function mat4LookAt(eye, center, up) {
  let zx = eye[0] - center[0]
  let zy = eye[1] - center[1]
  let zz = eye[2] - center[2]
  let len = Math.hypot(zx, zy, zz) || 1
  zx /= len; zy /= len; zz /= len

  let xx = up[1] * zz - up[2] * zy
  let xy = up[2] * zx - up[0] * zz
  let xz = up[0] * zy - up[1] * zx
  len = Math.hypot(xx, xy, xz) || 1
  xx /= len; xy /= len; xz /= len

  const yx = zy * xz - zz * xy
  const yy = zz * xx - zx * xz
  const yz = zx * xy - zy * xx

  return new Float32Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
    -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
    -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
    1
  ])
}

function mat4Translate(tx, ty, tz) {
  const m = mat4Identity()
  m[12] = tx; m[13] = ty; m[14] = tz
  return m
}

function mat4RotateX(rad) {
  const c = Math.cos(rad), s = Math.sin(rad)
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ])
}

function mat4RotateY(rad) {
  const c = Math.cos(rad), s = Math.sin(rad)
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ])
}

function mat4RotateZ(rad) {
  const c = Math.cos(rad), s = Math.sin(rad)
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ])
}

function mat4Scale(sx, sy, sz) {
  return new Float32Array([
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1
  ])
}

function transformPoint(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14]
  ]
}

function transformNormal(m, nx, ny, nz) {
  const sx2 = m[0] * m[0] + m[1] * m[1] + m[2] * m[2] || 1
  const sy2 = m[4] * m[4] + m[5] * m[5] + m[6] * m[6] || 1
  const sz2 = m[8] * m[8] + m[9] * m[9] + m[10] * m[10] || 1
  const rx = nx / sx2, ry = ny / sy2, rz = nz / sz2
  const tx = m[0] * rx + m[4] * ry + m[8] * rz
  const ty = m[1] * rx + m[5] * ry + m[9] * rz
  const tz = m[2] * rx + m[6] * ry + m[10] * rz
  const len = Math.hypot(tx, ty, tz) || 1
  return [tx / len, ty / len, tz / len]
}

// ─── Mesh Builder 幾何建構器 ─────────────────────────────────────────
class MeshBuilder {
  constructor() {
    this.positions = []
    this.normals = []
    this.colors = []
    this.materials = [] // [roughness, metallic, emissive]
    this.indices = []
  }

  addVertex(px, py, pz, nx, ny, nz, color, mat = [0.3, 0.1, 0.0]) {
    const idx = this.positions.length / 3
    this.positions.push(px, py, pz)
    this.normals.push(nx, ny, nz)
    this.colors.push(color[0], color[1], color[2])
    this.materials.push(mat[0], mat[1], mat[2])
    return idx
  }

  addTriangle(a, b, c) {
    this.indices.push(a, b, c)
  }

  // 超橢球體 (power < 1 呈現 SUI 125 招牌 K-Car 方中帶圓造型)
  addSuperEllipsoid(matrix, color, mat, segU = 24, segV = 18, powerU = 1.0, powerV = 1.0) {
    const baseIdx = this.positions.length / 3
    const spow = (val, p) => Math.sign(val) * Math.pow(Math.abs(val), p)

    for (let iv = 0; iv <= segV; iv++) {
      const v = (iv / segV) * Math.PI - Math.PI / 2
      const cv = Math.cos(v), sv = Math.sin(v)
      for (let iu = 0; iu <= segU; iu++) {
        const u = (iu / segU) * Math.PI * 2
        const cu = Math.cos(u), su = Math.sin(u)

        const lx = spow(cv, powerV) * spow(cu, powerU)
        const ly = spow(sv, powerV)
        const lz = spow(cv, powerV) * spow(su, powerU)

        const nxL = spow(cv, 2 - powerV) * spow(cu, 2 - powerU)
        const nyL = spow(sv, 2 - powerV)
        const nzL = spow(cv, 2 - powerV) * spow(su, 2 - powerU)
        const nLen = Math.hypot(nxL, nyL, nzL) || 1

        const p = transformPoint(matrix, lx, ly, lz)
        const n = transformNormal(matrix, nxL / nLen, nyL / nLen, nzL / nLen)
        this.addVertex(p[0], p[1], p[2], n[0], n[1], n[2], color, mat)
      }
    }

    const stride = segU + 1
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = baseIdx + iv * stride + iu
        const b = a + 1
        const c = a + stride
        const d = c + 1
        this.addTriangle(a, c, b)
        this.addTriangle(b, c, d)
      }
    }
  }

  // 圓角圓柱體 (預設沿 Y 軸 -1..+1，半徑 1)
  addRoundedCylinder(matrix, color, mat, segRadial = 28, bevelRatio = 0.15) {
    const profile = [
      [0.0, -1.0, 0, -1],
      [1.0 - bevelRatio, -1.0, 0, -1],
      [1.0 - bevelRatio * 0.3, -1.0 + bevelRatio * 0.3, 0.7, -0.7],
      [1.0, -1.0 + bevelRatio, 1, 0],
      [1.0, 1.0 - bevelRatio, 1, 0],
      [1.0 - bevelRatio * 0.3, 1.0 - bevelRatio * 0.3, 0.7, 0.7],
      [1.0 - bevelRatio, 1.0, 0, 1],
      [0.0, 1.0, 0, 1]
    ]
    const baseIdx = this.positions.length / 3
    const rings = profile.length

    for (let ir = 0; ir < rings; ir++) {
      const [rad, y, nr, ny] = profile[ir]
      for (let is = 0; is <= segRadial; is++) {
        const theta = (is / segRadial) * Math.PI * 2
        const c = Math.cos(theta), s = Math.sin(theta)
        const lx = rad * c, lz = rad * s
        const lnx = nr * c, lnz = nr * s
        const p = transformPoint(matrix, lx, y, lz)
        const n = transformNormal(matrix, lnx, ny, lnz)
        this.addVertex(p[0], p[1], p[2], n[0], n[1], n[2], color, mat)
      }
    }

    const stride = segRadial + 1
    for (let ir = 0; ir < rings - 1; ir++) {
      for (let is = 0; is < segRadial; is++) {
        const a = baseIdx + ir * stride + is
        const b = a + 1
        const c = a + stride
        const d = c + 1
        this.addTriangle(a, b, c)
        this.addTriangle(b, d, c)
      }
    }
  }

  // 圓環體 Torus (XY 平面，中心 Z 軸)
  addTorus(matrix, majorR, minorR, color, mat, segMajor = 36, segMinor = 20, arcRad = Math.PI * 2) {
    const baseIdx = this.positions.length / 3
    for (let i = 0; i <= segMajor; i++) {
      const u = (i / segMajor) * arcRad
      const cu = Math.cos(u), su = Math.sin(u)
      for (let j = 0; j <= segMinor; j++) {
        const v = (j / segMinor) * Math.PI * 2
        const cv = Math.cos(v), sv = Math.sin(v)

        const r = majorR + minorR * cv
        const lx = r * cu
        const ly = r * su
        const lz = minorR * sv

        const nx = cv * cu
        const ny = cv * su
        const nz = sv

        const p = transformPoint(matrix, lx, ly, lz)
        const n = transformNormal(matrix, nx, ny, nz)
        this.addVertex(p[0], p[1], p[2], n[0], n[1], n[2], color, mat)
      }
    }

    const stride = segMinor + 1
    for (let i = 0; i < segMajor; i++) {
      for (let j = 0; j < segMinor; j++) {
        const a = baseIdx + i * stride + j
        const b = a + 1
        const c = a + stride
        const d = c + 1
        this.addTriangle(a, c, b)
        this.addTriangle(b, c, d)
      }
    }
  }

  // 3D 樣條曲線圓管
  addSplineTube(points, radii, color, mat, segLen = 28, segCircle = 16, capEnds = true) {
    const sampleSpline = (t) => {
      const n = points.length - 1
      const scaled = Math.max(0, Math.min(n - 0.0001, t * n))
      const idx = Math.floor(scaled)
      const frac = scaled - idx

      const p0 = points[Math.max(0, idx - 1)]
      const p1 = points[idx]
      const p2 = points[Math.min(n, idx + 1)]
      const p3 = points[Math.min(n, idx + 2)]

      const r1 = Array.isArray(radii) ? radii[idx] : radii
      const r2 = Array.isArray(radii) ? radii[Math.min(n, idx + 1)] : radii
      const radius = r1 + (r2 - r1) * frac

      const f2 = frac * frac, f3 = f2 * frac
      const pos = [0, 1, 2].map(k =>
        0.5 * (
          (2 * p1[k]) +
          (-p0[k] + p2[k]) * frac +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3
        )
      )
      return { pos, radius }
    }

    const samples = []
    for (let i = 0; i <= segLen; i++) {
      samples.push(sampleSpline(i / segLen))
    }

    const baseIdx = this.positions.length / 3
    let prevUp = [0, 1, 0]

    for (let i = 0; i <= segLen; i++) {
      const curr = samples[i].pos
      const next = samples[Math.min(segLen, i + 1)].pos
      const prev = samples[Math.max(0, i - 1)].pos
      let tx = next[0] - prev[0]
      let ty = next[1] - prev[1]
      let tz = next[2] - prev[2]
      const tLen = Math.hypot(tx, ty, tz) || 1
      tx /= tLen; ty /= tLen; tz /= tLen

      let rx = prevUp[1] * tz - prevUp[2] * ty
      let ry = prevUp[2] * tx - prevUp[0] * tz
      let rz = prevUp[0] * ty - prevUp[1] * tx
      let rLen = Math.hypot(rx, ry, rz)
      if (rLen < 0.001) {
        rx = 1; ry = 0; rz = 0; rLen = 1
      }
      rx /= rLen; ry /= rLen; rz /= rLen

      const ux = ty * rz - tz * ry
      const uy = tz * rx - tx * rz
      const uz = tx * ry - ty * rx
      prevUp = [ux, uy, uz]

      const rad = samples[i].radius
      for (let j = 0; j <= segCircle; j++) {
        const ang = (j / segCircle) * Math.PI * 2
        const ca = Math.cos(ang), sa = Math.sin(ang)
        const nx = rx * ca + ux * sa
        const ny = ry * ca + uy * sa
        const nz = rz * ca + uz * sa
        this.addVertex(
          curr[0] + nx * rad,
          curr[1] + ny * rad,
          curr[2] + nz * rad,
          nx, ny, nz,
          color, mat
        )
      }
    }

    const stride = segCircle + 1
    for (let i = 0; i < segLen; i++) {
      for (let j = 0; j < segCircle; j++) {
        const a = baseIdx + i * stride + j
        const b = a + 1
        const c = a + stride
        const d = c + 1
        this.addTriangle(a, b, c)
        this.addTriangle(b, d, c)
      }
    }

    if (capEnds) {
      const first = samples[0].pos
      const last = samples[segLen].pos
      const cStart = this.addVertex(first[0], first[1], first[2], 0, 1, 0, color, mat)
      for (let j = 0; j < segCircle; j++) {
        this.addTriangle(cStart, baseIdx + j + 1, baseIdx + j)
      }
      const endRing = baseIdx + segLen * stride
      const cEnd = this.addVertex(last[0], last[1], last[2], 0, 1, 0, color, mat)
      for (let j = 0; j < segCircle; j++) {
        this.addTriangle(cEnd, endRing + j, endRing + j + 1)
      }
    }
  }

  addHelixSpring(pStart, pEnd, coilRadius, wireRadius, turns, color, mat) {
    const pts = []
    const steps = Math.round(turns * 12)
    const dx = pEnd[0] - pStart[0]
    const dy = pEnd[1] - pStart[1]
    const dz = pEnd[2] - pStart[2]
    const len = Math.hypot(dx, dy, dz) || 1
    const tx = dx / len, ty = dy / len, tz = dz / len

    const rx = 0, ry = 0, rz = 1
    const ux = ty * rz - tz * ry
    const uy = tz * rx - tx * rz
    const uz = tx * ry - ty * rx

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const ang = t * turns * Math.PI * 2
      const ca = Math.cos(ang), sa = Math.sin(ang)
      pts.push([
        pStart[0] + dx * t + (ux * ca + rx * sa) * coilRadius,
        pStart[1] + dy * t + (uy * ca + ry * sa) * coilRadius,
        pStart[2] + dz * t + (uz * ca + rz * sa) * coilRadius
      ])
    }
    this.addSplineTube(pts, wireRadius, color, mat, steps, 10, true)
  }
}

// ─── 建立 Suzuki SUI 125 前後輪 Mesh ──────────────────────────────────
// 座標系定義：
// -X 為車頭前方 (Front)，+X 為車尾後方 (Rear)，+Y 為上方 (Up)
// +Z 為車身左側 (Left side：碟煞盤、傳動箱、空濾)，-Z 為車身右側 (Right side：排氣管、風扇蓋)

function buildSuiWheelMesh(theme, isFront = true) {
  const b = new MeshBuilder()
  const tireMat = [0.68, 0.06, 0.0]    // 街跑胎橡膠質感
  const rimMat = [0.22, 0.45, 0.0]     // 黑鋁圈烤漆
  const discMat = [0.18, 0.82, 0.0]    // 亮銀金屬打孔碟盤

  // 1. 10 吋速克達街跑胎主體
  const tireR = 0.34
  const tubeR = 0.145
  const mTire = mat4Scale(1.0, 1.0, 1.08)
  b.addTorus(mTire, tireR, tubeR, [0.11, 0.12, 0.14], tireMat, 36, 22)

  // 細緻街跑胎排水紋飾環
  for (const side of [-1, 1]) {
    let mGroove = mat4Translate(0, 0, side * 0.06)
    b.addTorus(mGroove, tireR + tubeR * 0.88, 0.014, [0.15, 0.16, 0.19], tireMat, 32, 10)
  }

  // 2. 黑色鋁合金輪框外圈與 5 爪輪幅
  for (const side of [-1, 1]) {
    let mRimLip = mat4Translate(0, 0, side * 0.10)
    b.addTorus(mRimLip, 0.22, 0.032, theme.rim, rimMat, 28, 12)
  }

  let mHub = mat4Multiply(mat4RotateX(Math.PI / 2), mat4Scale(0.11, 0.11, 0.11))
  b.addRoundedCylinder(mHub, theme.rim, rimMat, 20, 0.15)

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    for (const side of [-1, 1]) {
      let mSpoke = mat4Translate(Math.cos(a) * 0.14, Math.sin(a) * 0.14, side * 0.075)
      mSpoke = mat4Multiply(mSpoke, mat4RotateZ(a))
      mSpoke = mat4Multiply(mSpoke, mat4Scale(0.085, 0.028, 0.022))
      b.addSuperEllipsoid(mSpoke, theme.rim, rimMat, 8, 6, 0.6, 0.6)
    }
  }

  // 3. 前輪專屬：左側 (+Z) 銀色打孔煞車碟盤 (完全還原型錄照片亮點！)
  if (isFront) {
    // 碟盤外圈亮銀盤面
    let mDisc = mat4Multiply(mat4Translate(0, 0, 0.115), mat4RotateX(Math.PI / 2))
    mDisc = mat4Multiply(mDisc, mat4Scale(0.215, 0.008, 0.215))
    b.addRoundedCylinder(mDisc, [0.85, 0.88, 0.92], discMat, 32, 0.05)

    // 碟盤內圈深灰固定座
    let mDiscInner = mat4Multiply(mat4Translate(0, 0, 0.118), mat4RotateX(Math.PI / 2))
    mDiscInner = mat4Multiply(mDiscInner, mat4Scale(0.125, 0.009, 0.125))
    b.addRoundedCylinder(mDiscInner, [0.22, 0.24, 0.28], rimMat, 24, 0.1)

    // 碟盤散熱打孔細節 (12 孔)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const rHole = 0.172
      let mHole = mat4Translate(Math.cos(a) * rHole, Math.sin(a) * rHole, 0.122)
      mHole = mat4Multiply(mHole, mat4RotateX(Math.PI / 2))
      mHole = mat4Multiply(mHole, mat4Scale(0.014, 0.004, 0.014))
      b.addRoundedCylinder(mHole, [0.14, 0.15, 0.18], tireMat, 10, 0.1)
    }
  }

  return b
}

// ─── 建立 Suzuki SUI 125 車身總成 ────────────────────────────────────
function buildSuiBodyMesh(theme, lightsOn = true, turnSignalBlink = false) {
  const b = new MeshBuilder()

  const bodyMat = [theme.bodyRoughness ?? 0.18, theme.bodyMetallic ?? 0.22, 0.0]
  const innerMat = [0.68, 0.06, 0.0]    // 消光黑內裝質感
  const seatMat = [0.56, 0.05, 0.0]     // 坐墊皮革微霧面
  const metalMat = [0.24, 0.65, 0.0]    // 金屬銀
  const chromeMat = [0.12, 0.85, 0.0]   // 電鍍亮銀
  const darkMetalMat = [0.35, 0.35, 0.0] // 黑色金屬前叉/排氣管/後扶手

  // ── 1. 前叉避震、防塵套與前碟煞卡鉗 (前輪中心在 (-0.82, 0.48, 0)) ──
  for (const side of [-1, 1]) {
    const zFork = side * 0.155
    // 黑色前叉下筒
    b.addSplineTube(
      [
        [-0.82, 0.46, zFork],
        [-0.71, 0.84, zFork]
      ],
      0.042,
      [0.10, 0.11, 0.13],
      darkMetalMat,
      10,
      16
    )

    // 前叉防塵套 (4 圈皺褶橡膠套，SUI 125 前叉招牌細節)
    for (let k = 0; k < 4; k++) {
      const t = k / 3
      const fx = -0.71 + t * 0.045
      const fy = 0.83 + t * 0.11
      let mBoot = mat4Translate(fx, fy, zFork)
      mBoot = mat4Multiply(mBoot, mat4RotateZ(-0.36))
      mBoot = mat4Multiply(mBoot, mat4Scale(0.052, 0.022, 0.052))
      b.addSuperEllipsoid(mBoot, [0.12, 0.13, 0.15], innerMat, 14, 10, 0.8, 0.8)
    }
  }

  // 左側 (+Z) 黑色前碟煞卡鉗与煞車油管
  let mCaliper = mat4Translate(-0.69, 0.54, 0.145)
  mCaliper = mat4Multiply(mCaliper, mat4RotateZ(0.35))
  mCaliper = mat4Multiply(mCaliper, mat4Scale(0.065, 0.085, 0.045))
  b.addSuperEllipsoid(mCaliper, [0.14, 0.15, 0.18], darkMetalMat, 12, 10, 0.6, 0.6)

  // ── 2. SUI 125 招牌寬厚鴨嘴式前土除 (Duckbill Front Fender) ──
  // 上半部往前延伸的寬平鴨嘴弧面
  let mDuckbillTop = mat4Translate(-0.88, 0.87, 0)
  mDuckbillTop = mat4Multiply(mDuckbillTop, mat4RotateZ(0.24))
  mDuckbillTop = mat4Multiply(mDuckbillTop, mat4Scale(0.34, 0.095, 0.255))
  b.addSuperEllipsoid(mDuckbillTop, theme.body, bodyMat, 26, 20, 0.62, 0.65)

  // 前土除兩側往下包覆的裙邊
  let mFenderSkirt = mat4Translate(-0.80, 0.79, 0)
  mFenderSkirt = mat4Multiply(mFenderSkirt, mat4RotateZ(-0.18))
  mFenderSkirt = mat4Multiply(mFenderSkirt, mat4Scale(0.28, 0.14, 0.265))
  b.addSuperEllipsoid(mFenderSkirt, theme.body, bodyMat, 24, 18, 0.62, 0.65)

  // ── 3. K-Car 方正圓潤前面板 (斜板) + 貫穿式燻黑方向燈飾條 + S 廠徽 ──
  // 斜板主體 (從前土除上方一路斜上延伸至龍頭下方)
  let mFrontShield = mat4Translate(-0.68, 1.24, 0)
  mFrontShield = mat4Multiply(mFrontShield, mat4RotateZ(-0.42))
  mFrontShield = mat4Multiply(mFrontShield, mat4Scale(0.16, 0.37, 0.275))
  b.addSuperEllipsoid(mFrontShield, theme.body, bodyMat, 28, 22, 0.56, 0.62)

  // 斜板下半部與前土除銜接基座
  let mShieldLower = mat4Translate(-0.75, 0.98, 0)
  mShieldLower = mat4Multiply(mShieldLower, mat4RotateZ(-0.15))
  mShieldLower = mat4Multiply(mShieldLower, mat4Scale(0.18, 0.14, 0.272))
  b.addSuperEllipsoid(mShieldLower, theme.body, bodyMat, 24, 18, 0.56, 0.62)

  // ★ SUI 125 靈魂特徵：前面板「貫穿式燻黑飾條 + 左右方形方向燈」 ★
  let mLightBarHousing = mat4Translate(-0.83, 1.07, 0)
  mLightBarHousing = mat4Multiply(mLightBarHousing, mat4RotateZ(-0.32))
  mLightBarHousing = mat4Multiply(mLightBarHousing, mat4Scale(0.065, 0.068, 0.262))
  b.addSuperEllipsoid(mLightBarHousing, [0.06, 0.07, 0.09], [0.12, 0.35, 0.0], 24, 16, 0.45, 0.48)

  // 貫穿飾條左右兩端的方形透明/琥珀方向燈
  for (const side of [-1, 1]) {
    let mFrontTurn = mat4Translate(-0.855, 1.07, side * 0.185)
    mFrontTurn = mat4Multiply(mFrontTurn, mat4RotateZ(-0.32))
    mFrontTurn = mat4Multiply(mFrontTurn, mat4Scale(0.045, 0.048, 0.058))
    const turnCol = turnSignalBlink
      ? [1.0, 0.62, 0.12]
      : (lightsOn ? [0.95, 0.82, 0.55] : [0.78, 0.80, 0.84])
    const turnEmissive = turnSignalBlink ? 0.92 : (lightsOn ? 0.38 : 0.0)
    b.addSuperEllipsoid(mFrontTurn, turnCol, [0.15, 0.2, turnEmissive], 16, 14, 0.45, 0.45)
  }

  // 前面板上方銀色立體 Suzuki "S" 廠徽
  let mEmblemTop = mat4Translate(-0.66, 1.46, 0)
  mEmblemTop = mat4Multiply(mEmblemTop, mat4RotateZ(-0.42))
  mEmblemTop = mat4Multiply(mEmblemTop, mat4Scale(0.018, 0.032, 0.038))
  b.addSuperEllipsoid(mEmblemTop, [0.92, 0.95, 0.98], chromeMat, 12, 10, 0.5, 0.5)

  // ── 4. 龍頭車頭殼 + 經典方圓造型大燈 + 復古方型後照鏡 ──
  // 龍頭脖頸連接柱
  let mNeck = mat4Translate(-0.52, 1.58, 0)
  mNeck = mat4Multiply(mNeck, mat4RotateZ(-0.36))
  mNeck = mat4Multiply(mNeck, mat4Scale(0.11, 0.12, 0.14))
  b.addSuperEllipsoid(mNeck, theme.body, bodyMat, 18, 14, 0.65, 0.65)

  // 龍頭中央車頭殼 (方中帶圓)
  let mHeadCowl = mat4Translate(-0.48, 1.72, 0)
  mHeadCowl = mat4Multiply(mHeadCowl, mat4RotateZ(-0.10))
  mHeadCowl = mat4Multiply(mHeadCowl, mat4Scale(0.145, 0.115, 0.19))
  b.addSuperEllipsoid(mHeadCowl, theme.body, bodyMat, 24, 18, 0.55, 0.58)

  // 龍頭左右延伸把手護蓋 (包覆至左右握把內側)
  for (const side of [-1, 1]) {
    let mWing = mat4Translate(-0.46, 1.71, side * 0.23)
    mWing = mat4Multiply(mWing, mat4RotateY(side * -0.15))
    mWing = mat4Multiply(mWing, mat4Scale(0.10, 0.078, 0.14))
    b.addSuperEllipsoid(mWing, theme.body, bodyMat, 18, 14, 0.62, 0.65)
  }

  // ★ SUI 125 招牌「方圓造型水晶大燈」 ★
  // 大燈外框飾環
  let mHeadlightFrame = mat4Translate(-0.58, 1.72, 0)
  mHeadlightFrame = mat4Multiply(mHeadlightFrame, mat4RotateZ(-0.08))
  mHeadlightFrame = mat4Multiply(mHeadlightFrame, mat4Scale(0.068, 0.098, 0.128))
  b.addSuperEllipsoid(mHeadlightFrame, [0.22, 0.24, 0.28], metalMat, 22, 18, 0.48, 0.48)

  // 大燈內部多邊形水晶反射鏡面 (開燈時發出明亮暖白光)
  let mHeadlightLens = mat4Translate(-0.615, 1.72, 0)
  mHeadlightLens = mat4Multiply(mHeadlightLens, mat4RotateZ(-0.08))
  mHeadlightLens = mat4Multiply(mHeadlightLens, mat4Scale(0.045, 0.082, 0.112))
  const hlColor = lightsOn ? [1.0, 0.98, 0.90] : [0.85, 0.89, 0.94]
  const hlMat = lightsOn ? [0.10, 0.25, 0.85] : [0.14, 0.65, 0.05]
  b.addSuperEllipsoid(mHeadlightLens, hlColor, hlMat, 22, 18, 0.48, 0.48)

  // 龍頭後方黑色儀表內蓋與液晶儀表板 (俯視與後視可見)
  let mDashPod = mat4Translate(-0.41, 1.74, 0)
  mDashPod = mat4Multiply(mDashPod, mat4RotateZ(0.45))
  mDashPod = mat4Multiply(mDashPod, mat4Scale(0.08, 0.08, 0.15))
  b.addSuperEllipsoid(mDashPod, theme.innerPlastic, innerMat, 16, 12, 0.55, 0.55)

  let mLcdScreen = mat4Translate(-0.38, 1.77, 0)
  mLcdScreen = mat4Multiply(mLcdScreen, mat4RotateZ(0.55))
  mLcdScreen = mat4Multiply(mLcdScreen, mat4Scale(0.03, 0.055, 0.095))
  b.addSuperEllipsoid(mLcdScreen, [0.22, 0.68, 0.96], [0.2, 0.1, lightsOn ? 0.65 : 0.1], 14, 10, 0.45, 0.45)

  // 左右黑色握把、煞車拉桿與「復古方型後照鏡」
  for (const side of [-1, 1]) {
    // 黑色防滑握把
    b.addSplineTube(
      [
        [-0.45, 1.70, side * 0.33],
        [-0.42, 1.69, side * 0.53]
      ],
      0.036,
      [0.14, 0.15, 0.17],
      innerMat,
      8,
      14
    )

    // 前後煞車拉桿
    b.addSplineTube(
      [
        [-0.48, 1.69, side * 0.35],
        [-0.53, 1.68, side * 0.42],
        [-0.50, 1.67, side * 0.52]
      ],
      0.015,
      [0.20, 0.22, 0.25],
      darkMetalMat,
      8,
      10
    )

    // 黑色折角後照鏡支架桿
    b.addSplineTube(
      [
        [-0.45, 1.76, side * 0.29],
        [-0.44, 1.93, side * 0.34],
        [-0.43, 2.04, side * 0.43]
      ],
      0.016,
      [0.12, 0.13, 0.15],
      darkMetalMat,
      10,
      10
    )

    // 復古方型/梯形黑色後照鏡殼 (完全對照實車照片的方型後照鏡)
    let mMirrorHousing = mat4Translate(-0.43, 2.07, side * 0.46)
    mMirrorHousing = mat4Multiply(mMirrorHousing, mat4RotateY(side * 0.22))
    mMirrorHousing = mat4Multiply(mMirrorHousing, mat4RotateX(side * -0.10))
    mMirrorHousing = mat4Multiply(mMirrorHousing, mat4Scale(0.032, 0.068, 0.098))
    b.addSuperEllipsoid(mMirrorHousing, [0.12, 0.13, 0.15], innerMat, 18, 14, 0.48, 0.52)

    // 後照鏡反光鏡面
    let mMirrorGlass = mat4Translate(-0.408, 2.07, side * 0.46)
    mMirrorGlass = mat4Multiply(mMirrorGlass, mat4RotateY(side * 0.22))
    mMirrorGlass = mat4Multiply(mMirrorGlass, mat4RotateX(side * -0.10))
    mMirrorGlass = mat4Multiply(mMirrorGlass, mat4Scale(0.015, 0.056, 0.084))
    b.addSuperEllipsoid(mMirrorGlass, [0.74, 0.84, 0.92], chromeMat, 14, 12, 0.48, 0.52)
  }

  // ── 5. 黑色內裝 (前置物盒/鎖頭) + 寬敞平踏板 + 下導流底殼 ──
  // 龍頭下方黑色內裝護板
  let mInnerLeg = mat4Translate(-0.56, 1.14, 0)
  mInnerLeg = mat4Multiply(mInnerLeg, mat4RotateZ(-0.38))
  mInnerLeg = mat4Multiply(mInnerLeg, mat4Scale(0.11, 0.36, 0.245))
  b.addSuperEllipsoid(mInnerLeg, theme.innerPlastic, innerMat, 20, 16, 0.58, 0.62)

  // 前開放式置物槽與磁石鎖頭凸塊
  let mFrontPocket = mat4Translate(-0.48, 1.22, 0.13)
  mFrontPocket = mat4Multiply(mFrontPocket, mat4Scale(0.06, 0.10, 0.09))
  b.addSuperEllipsoid(mFrontPocket, [0.09, 0.10, 0.12], innerMat, 14, 12, 0.5, 0.5)

  let mKeySwitch = mat4Translate(-0.46, 1.28, -0.13)
  mKeySwitch = mat4Multiply(mKeySwitch, mat4Scale(0.05, 0.05, 0.05))
  b.addSuperEllipsoid(mKeySwitch, [0.22, 0.24, 0.28], metalMat, 12, 10, 0.6, 0.6)

  // 寬敞腳踏平踏板 (Step-through Flat Floorboard)
  let mFloorboard = mat4Translate(-0.18, 0.57, 0)
  mFloorboard = mat4Multiply(mFloorboard, mat4Scale(0.38, 0.065, 0.255))
  b.addSuperEllipsoid(mFloorboard, theme.innerPlastic, innerMat, 22, 16, 0.55, 0.55)

  // 底部黑色下導流船底殼
  let mUnderbelly = mat4Translate(-0.20, 0.46, 0)
  mUnderbelly = mat4Multiply(mUnderbelly, mat4Scale(0.42, 0.08, 0.22))
  b.addSuperEllipsoid(mUnderbelly, [0.08, 0.09, 0.11], innerMat, 20, 14, 0.65, 0.65)

  // 左右後座飛旋踏板銀色飾條
  for (const side of [-1, 1]) {
    let mPeg = mat4Translate(0.24, 0.60, side * 0.255)
    mPeg = mat4Multiply(mPeg, mat4RotateZ(0.18))
    mPeg = mat4Multiply(mPeg, mat4Scale(0.085, 0.022, 0.025))
    b.addSuperEllipsoid(mPeg, [0.76, 0.79, 0.84], metalMat, 12, 10, 0.5, 0.5)
  }

  // ── 6. 坐墊下方黑色胸蓋 + SUI 125 招牌方正復古車尾側殼 + 寬厚平整坐墊 ──
  // 坐墊正下方黑色防刮胸蓋 (實車照片中雙腿中間偏後的黑色區塊)
  let mCenterCover = mat4Translate(0.16, 0.88, 0)
  mCenterCover = mat4Multiply(mCenterCover, mat4RotateZ(0.15))
  mCenterCover = mat4Multiply(mCenterCover, mat4Scale(0.22, 0.27, 0.245))
  b.addSuperEllipsoid(mCenterCover, theme.innerPlastic, innerMat, 22, 18, 0.58, 0.62)

  // ★ SUI 125 招牌「K-Car 方正寬體後側殼」 (從胸蓋斜切往後延伸至車尾) ★
  let mRearBody = mat4Translate(0.58, 0.95, 0)
  mRearBody = mat4Multiply(mRearBody, mat4RotateZ(0.05))
  mRearBody = mat4Multiply(mRearBody, mat4Scale(0.39, 0.185, 0.272))
  b.addSuperEllipsoid(mRearBody, theme.body, bodyMat, 28, 22, 0.52, 0.56)

  // 車身兩側 SUI 125 立體銀色銘牌飾條
  for (const side of [-1, 1]) {
    let mBadge = mat4Translate(0.64, 0.84, side * 0.272)
    mBadge = mat4Multiply(mBadge, mat4RotateZ(0.06))
    mBadge = mat4Multiply(mBadge, mat4Scale(0.085, 0.018, 0.012))
    b.addSuperEllipsoid(mBadge, [0.85, 0.88, 0.92], chromeMat, 12, 8, 0.45, 0.45)
  }

  // ★ SUI 125 招牌「寬大厚實平坐墊 (Loaf Seat)」 ★
  let mSeat = mat4Translate(0.42, 1.19, 0)
  mSeat = mat4Multiply(mSeat, mat4RotateZ(0.03))
  mSeat = mat4Multiply(mSeat, mat4Scale(0.43, 0.125, 0.252))
  b.addSuperEllipsoid(mSeat, theme.seat, seatMat, 28, 20, 0.58, 0.65)

  // 黑色 U 型金屬後扶手 (Rear Grab Rail)
  b.addSplineTube(
    [
      [0.72, 1.17, -0.22],
      [0.92, 1.20, -0.20],
      [1.01, 1.21, -0.11],
      [1.03, 1.21, 0.0],
      [1.01, 1.21, 0.11],
      [0.92, 1.20, 0.20],
      [0.72, 1.17, 0.22]
    ],
    0.024,
    [0.10, 0.11, 0.13],
    darkMetalMat,
    24,
    12
  )

  // ── 7. 車尾橫向矩陣式復古尾燈 + 後牌照土除與 SUZUKI 車牌 (完全還原圖3車尾！) ──
  // 尾燈黑色外框總成
  let mTailHousing = mat4Translate(0.96, 1.00, 0)
  mTailHousing = mat4Multiply(mTailHousing, mat4RotateZ(-0.12))
  mTailHousing = mat4Multiply(mTailHousing, mat4Scale(0.055, 0.068, 0.235))
  b.addSuperEllipsoid(mTailHousing, [0.08, 0.09, 0.11], innerMat, 20, 14, 0.45, 0.48)

  // 中央紅色煞車尾燈
  let mTailRed = mat4Translate(0.995, 1.00, 0)
  mTailRed = mat4Multiply(mTailRed, mat4RotateZ(-0.12))
  mTailRed = mat4Multiply(mTailRed, mat4Scale(0.032, 0.046, 0.125))
  b.addSuperEllipsoid(
    mTailRed,
    [0.96, 0.14, 0.18],
    [0.15, 0.1, lightsOn ? 0.85 : 0.15],
    18,
    12,
    0.45,
    0.45
  )

  // 尾燈左右兩側方形黃色後方向燈
  for (const side of [-1, 1]) {
    let mRearTurn = mat4Translate(0.99, 1.00, side * 0.175)
    mRearTurn = mat4Multiply(mRearTurn, mat4RotateZ(-0.12))
    mRearTurn = mat4Multiply(mRearTurn, mat4Scale(0.032, 0.045, 0.045))
    const rtEmissive = turnSignalBlink ? 0.92 : (lightsOn ? 0.35 : 0.05)
    b.addSuperEllipsoid(mRearTurn, [0.98, 0.58, 0.10], [0.18, 0.1, rtEmissive], 14, 12, 0.45, 0.45)
  }

  // 黑色後牌照板土除 (Rear Mudguard)
  let mRearFender = mat4Translate(1.03, 0.72, 0)
  mRearFender = mat4Multiply(mRearFender, mat4RotateZ(-0.34))
  mRearFender = mat4Multiply(mRearFender, mat4Scale(0.045, 0.25, 0.175))
  b.addSuperEllipsoid(mRearFender, theme.innerPlastic, innerMat, 18, 14, 0.52, 0.55)

  // 銀灰色 SUZUKI 展示車牌
  let mPlate = mat4Translate(1.07, 0.78, 0)
  mPlate = mat4Multiply(mPlate, mat4RotateZ(-0.34))
  mPlate = mat4Multiply(mPlate, mat4Scale(0.015, 0.085, 0.145))
  b.addSuperEllipsoid(mPlate, [0.76, 0.80, 0.84], metalMat, 14, 10, 0.35, 0.35)

  // 車尾下方紅色反光片與兩側圓形橘色反光片
  let mRearReflector = mat4Translate(1.11, 0.58, 0)
  mRearReflector = mat4Multiply(mRearReflector, mat4RotateZ(-0.34))
  mRearReflector = mat4Multiply(mRearReflector, mat4Scale(0.015, 0.024, 0.052))
  b.addSuperEllipsoid(mRearReflector, [0.88, 0.12, 0.15], [0.2, 0.1, 0.25], 10, 8, 0.4, 0.4)

  for (const side of [-1, 1]) {
    let mSideRef = mat4Translate(0.95, 0.86, side * 0.19)
    mSideRef = mat4Multiply(mSideRef, mat4RotateX(Math.PI / 2))
    mSideRef = mat4Multiply(mSideRef, mat4Scale(0.032, 0.015, 0.032))
    b.addRoundedCylinder(mSideRef, [0.96, 0.52, 0.10], [0.25, 0.1, 0.2], 14, 0.2)
  }

  // ── 8. 左側 (+Z)：黑色傳動箱蓋 (CVT) + 空濾盒 + 單槍後避震 ──
  // 傳動外蓋長橢圓主體
  let mCvtCase = mat4Translate(0.58, 0.50, 0.165)
  mCvtCase = mat4Multiply(mCvtCase, mat4RotateZ(-0.05))
  mCvtCase = mat4Multiply(mCvtCase, mat4Scale(0.28, 0.105, 0.065))
  b.addSuperEllipsoid(mCvtCase, [0.11, 0.12, 0.14], darkMetalMat, 22, 16, 0.72, 0.72)

  // 傳動蓋後方碗公圓鼓
  let mCvtRearBoss = mat4Translate(0.74, 0.49, 0.185)
  mCvtRearBoss = mat4Multiply(mCvtRearBoss, mat4RotateX(Math.PI / 2))
  mCvtRearBoss = mat4Multiply(mCvtRearBoss, mat4Scale(0.095, 0.045, 0.095))
  b.addRoundedCylinder(mCvtRearBoss, [0.13, 0.14, 0.16], darkMetalMat, 20, 0.25)

  // 傳動箱上方黑色空濾盒 (Air Filter Box)
  let mAirbox = mat4Translate(0.64, 0.66, 0.175)
  mAirbox = mat4Multiply(mAirbox, mat4RotateZ(0.08))
  mAirbox = mat4Multiply(mAirbox, mat4Scale(0.20, 0.075, 0.065))
  b.addSuperEllipsoid(mAirbox, theme.innerPlastic, innerMat, 18, 14, 0.55, 0.55)

  // 左側黑色螺旋後避震器
  b.addHelixSpring(
    [0.74, 0.82, 0.165],
    [0.80, 0.56, 0.175],
    0.042,
    0.015,
    5.0,
    [0.15, 0.16, 0.19],
    darkMetalMat
  )

  // ── 9. 右側 (-Z)：圓形導風散熱蓋 + 黑色粗壯防燙蓋排氣管 (完全還原圖3右側！) ──
  // 圓形冷卻風扇外蓋
  let mFanCover = mat4Translate(0.42, 0.53, -0.155)
  mFanCover = mat4Multiply(mFanCover, mat4RotateX(Math.PI / 2))
  mFanCover = mat4Multiply(mFanCover, mat4Scale(0.11, 0.045, 0.11))
  b.addRoundedCylinder(mFanCover, [0.12, 0.13, 0.15], innerMat, 22, 0.2)

  // 排氣管前段下繞彎管
  b.addSplineTube(
    [
      [0.32, 0.42, -0.10],
      [0.42, 0.36, -0.18],
      [0.54, 0.44, -0.21]
    ],
    0.032,
    [0.18, 0.19, 0.22],
    darkMetalMat,
    12,
    12
  )

  // 排氣管主體黑色消音筒 (往上微揚角度與圖3一致)
  b.addSplineTube(
    [
      [0.48, 0.45, -0.21],
      [0.72, 0.53, -0.22],
      [0.94, 0.61, -0.22]
    ],
    [0.075, 0.098, 0.088],
    [0.11, 0.12, 0.14],
    darkMetalMat,
    18,
    22
  )

  // 排氣管外側立體防燙蓋 (Heat Shield)
  let mHeatShield = mat4Translate(0.71, 0.53, -0.265)
  mHeatShield = mat4Multiply(mHeatShield, mat4RotateZ(0.32))
  mHeatShield = mat4Multiply(mHeatShield, mat4Scale(0.21, 0.072, 0.045))
  b.addSuperEllipsoid(mHeatShield, [0.14, 0.15, 0.18], innerMat, 20, 14, 0.58, 0.62)

  // 防燙蓋上的 3 道斜向散熱刻槽飾條 (圖3排氣管細節)
  for (let k = -1; k <= 1; k++) {
    let mSlot = mat4Translate(0.62 + k * 0.038, 0.49 + k * 0.012, -0.305)
    mSlot = mat4Multiply(mSlot, mat4RotateZ(0.85))
    mSlot = mat4Multiply(mSlot, mat4Scale(0.028, 0.008, 0.01))
    b.addSuperEllipsoid(mSlot, [0.45, 0.48, 0.54], metalMat, 8, 6, 0.5, 0.5)
  }

  // 排氣管尾端銀灰色防燙尾蓋與排氣出口
  let mExhaustCap = mat4Translate(0.95, 0.615, -0.22)
  mExhaustCap = mat4Multiply(mExhaustCap, mat4RotateZ(-1.25))
  mExhaustCap = mat4Multiply(mExhaustCap, mat4Scale(0.068, 0.025, 0.068))
  b.addRoundedCylinder(mExhaustCap, [0.48, 0.52, 0.56], metalMat, 18, 0.25)

  return b
}

// 建立 3D 數位展示台旋轉底座 (Digital Showroom Turntable Pedestal)
function buildTurntableMesh() {
  const b = new MeshBuilder()

  // 1. 展示台主圓盤 (深色科技感金屬平台)
  let mBase = mat4Translate(0.0, 0.06, 0)
  mBase = mat4Multiply(mBase, mat4Scale(1.78, 0.065, 1.78))
  b.addRoundedCylinder(mBase, [0.11, 0.14, 0.20], [0.35, 0.45, 0.0], 48, 0.22)

  // 2. 展示台頂部內圈舞台面 (高度 y = 0.13，剛好承托前後輪底部 y = 0.48 - 0.34 = 0.14)
  let mStageTop = mat4Translate(0.0, 0.125, 0)
  mStageTop = mat4Multiply(mStageTop, mat4Scale(1.60, 0.012, 1.60))
  b.addRoundedCylinder(mStageTop, [0.17, 0.21, 0.29], [0.28, 0.35, 0.02], 48, 0.1)

  // 3. 外圈發光霓虹光環
  let mGlowRing = mat4Translate(0.0, 0.12, 0)
  mGlowRing = mat4Multiply(mGlowRing, mat4RotateX(Math.PI / 2))
  b.addTorus(mGlowRing, 1.68, 0.022, [0.18, 0.74, 0.98], [0.15, 0.1, 0.85], 56, 12)

  // 4. 內圈刻度發光環
  let mInnerRing = mat4Translate(0.0, 0.136, 0)
  mInnerRing = mat4Multiply(mInnerRing, mat4RotateX(Math.PI / 2))
  b.addTorus(mInnerRing, 1.32, 0.012, [0.25, 0.62, 0.92], [0.2, 0.1, 0.55], 48, 10)

  // 5. 展示台 24 個方位角度刻度塊
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const isMajor = i % 6 === 0
    const r = 1.46
    let mTick = mat4Translate(Math.cos(a) * r, 0.138, Math.sin(a) * r)
    mTick = mat4Multiply(mTick, mat4RotateY(-a))
    mTick = mat4Multiply(mTick, mat4Scale(isMajor ? 0.068 : 0.036, 0.005, isMajor ? 0.020 : 0.010))
    const tickCol = isMajor ? [0.35, 0.85, 1.0] : [0.28, 0.36, 0.48]
    const tickEmissive = isMajor ? 0.65 : 0.15
    b.addSuperEllipsoid(mTick, tickCol, [0.3, 0.2, tickEmissive], 8, 6, 0.5, 0.5)
  }

  // 6. 前後輪下方的深色接觸陰影墊
  for (const wx of [-0.82, 0.80]) {
    let mShadow = mat4Translate(wx, 0.138, 0)
    mShadow = mat4Multiply(mShadow, mat4Scale(0.35, 0.003, 0.24))
    b.addRoundedCylinder(mShadow, [0.04, 0.05, 0.08], [0.95, 0.0, 0.0], 24, 0.05)
  }

  return b
}

// ─── WebGL Shader 著色器 (針對黑色烤漆強化鏡面高光與邊緣輪廓光) ──────
const VERTEX_SHADER_SRC = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute vec3 aMaterial; // x: roughness, y: metallic, z: emissive

  uniform mat4 uProjView;
  uniform mat4 uModel;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;
  varying vec3 vMaterial;

  void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize((uModel * vec4(aNormal, 0.0)).xyz);
    vColor = aColor;
    vMaterial = aMaterial;
    gl_Position = uProjView * worldPos;
  }
`

const FRAGMENT_SHADER_SRC = `
  precision highp float;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;
  varying vec3 vMaterial;

  uniform vec3 uCameraPos;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);

    float roughness = vMaterial.x;
    float metallic = vMaterial.y;
    float emissive = vMaterial.z;

    // 攝影棚三點式立體佈光 (主光 + 左側補光 + 頂部車身輪廓高光)
    vec3 L1 = normalize(vec3(-0.55, 0.82, 0.65));
    vec3 L2 = normalize(vec3(0.65, 0.45, -0.55));
    vec3 L3 = normalize(vec3(0.0, 0.95, 0.25));

    float wrap = 0.35;
    float diff1 = max(0.0, (dot(N, L1) + wrap) / (1.0 + wrap));
    float diff2 = max(0.0, (dot(N, L2) + wrap) / (1.0 + wrap));

    float hemi = N.y * 0.5 + 0.5;
    vec3 ambient = mix(vec3(0.24, 0.28, 0.36), vec3(0.58, 0.62, 0.68), hemi);

    float groundAo = clamp((vWorldPos.y - 0.05) * 1.5, 0.55, 1.0);

    vec3 baseCol = vColor;
    vec3 diffuseLight = ambient * groundAo + diff1 * vec3(0.90, 0.89, 0.87) + diff2 * vec3(0.28, 0.33, 0.42);
    vec3 litColor = baseCol * mix(diffuseLight, diffuseLight * 1.18, metallic);

    // 烤漆清漆層高光 (Clearcoat Specular，讓黑色車殼依然層次分明、立體晶亮)
    vec3 H1 = normalize(L1 + V);
    vec3 H2 = normalize(L2 + V);
    vec3 H3 = normalize(L3 + V);
    float shininess = mix(110.0, 16.0, roughness);
    float specStrength = mix(0.65, 0.08, roughness) * (1.0 + metallic * 0.9);
    float spec1 = pow(max(0.0, dot(N, H1)), shininess) * specStrength;
    float spec2 = pow(max(0.0, dot(N, H2)), shininess * 0.7) * specStrength * 0.42;
    float spec3 = pow(max(0.0, dot(N, H3)), shininess * 0.5) * specStrength * 0.38;
    vec3 specCol = vec3(0.96, 0.98, 1.0);

    // Fresnel 邊緣輪廓光 (讓黑色車身在深色背景中線條清晰俐落)
    float rim = pow(1.0 - max(0.0, dot(N, V)), 2.8);
    vec3 rimCol = vec3(0.52, 0.76, 1.0) * rim * (0.28 + metallic * 0.25) * clamp(N.y + 0.5, 0.0, 1.0);

    vec3 finalColor = litColor + (spec1 + spec2 + spec3) * specCol + rimCol;

    // 自發光 (方圓大燈、貫穿式方向燈、矩陣尾燈、展示台光環)
    finalColor = mix(finalColor, baseCol * 1.38, clamp(emissive, 0.0, 1.0));

    // 色調映射
    finalColor = finalColor / (finalColor + vec3(0.18)) * 1.16;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// ─── 主渲染控制器類別 ────────────────────────────────────────────────
export class Moto3DShowroomController {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.gl = canvas.getContext('webgl', { antialias: true, alpha: true })
    if (!this.gl) {
      throw new Error('瀏覽器不支援 WebGL')
    }

    // 預設視角：左前 35 度型錄視角 (與您上傳的圖1、圖2、圖4角度完全一致！)
    this.yaw = options.initialYaw ?? -0.58
    this.pitch = options.initialPitch ?? 0.14
    this.distance = options.initialDistance ?? 4.55
    this.velYaw = 0
    this.velPitch = 0

    this.autoRotate = options.autoRotate ?? true
    this.lightsOn = options.lightsOn ?? true
    this.engineRunning = options.engineRunning ?? true
    this.themeId = options.themeId ?? 'sui_black'

    this.wheelAngle = 0
    this.animTime = 0
    this.blinkState = false
    this.lastBlinkToggle = 0
    this.exhaustPuffs = []
    this.rafId = null
    this.isDisposed = false

    this._initWebGL()
    this.rebuildScene()
    this._startLoop()
  }

  _compileShader(type, source) {
    const gl = this.gl
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    }
    return shader
  }

  _initWebGL() {
    const gl = this.gl
    const vs = this._compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC)
    const fs = this._compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC)
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.useProgram(prog)
    this.program = prog

    this.attribs = {
      aPosition: gl.getAttribLocation(prog, 'aPosition'),
      aNormal: gl.getAttribLocation(prog, 'aNormal'),
      aColor: gl.getAttribLocation(prog, 'aColor'),
      aMaterial: gl.getAttribLocation(prog, 'aMaterial')
    }
    this.uniforms = {
      uProjView: gl.getUniformLocation(prog, 'uProjView'),
      uModel: gl.getUniformLocation(prog, 'uModel'),
      uCameraPos: gl.getUniformLocation(prog, 'uCameraPos')
    }

    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
    gl.clearColor(0, 0, 0, 0)
  }

  _uploadMesh(builder) {
    const gl = this.gl
    const createBuf = (target, data) => {
      const buf = gl.createBuffer()
      gl.bindBuffer(target, buf)
      gl.bufferData(target, data, gl.STATIC_DRAW)
      return buf
    }
    return {
      posBuf: createBuf(gl.ARRAY_BUFFER, new Float32Array(builder.positions)),
      normBuf: createBuf(gl.ARRAY_BUFFER, new Float32Array(builder.normals)),
      colBuf: createBuf(gl.ARRAY_BUFFER, new Float32Array(builder.colors)),
      matBuf: createBuf(gl.ARRAY_BUFFER, new Float32Array(builder.materials)),
      idxBuf: createBuf(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(builder.indices)),
      count: builder.indices.length
    }
  }

  _freeMesh(gpuMesh) {
    if (!gpuMesh || !this.gl) return
    const gl = this.gl
    gl.deleteBuffer(gpuMesh.posBuf)
    gl.deleteBuffer(gpuMesh.normBuf)
    gl.deleteBuffer(gpuMesh.colBuf)
    gl.deleteBuffer(gpuMesh.matBuf)
    gl.deleteBuffer(gpuMesh.idxBuf)
  }

  rebuildScene() {
    const theme = MOTO_COLOR_THEMES[this.themeId] || MOTO_COLOR_THEMES.sui_black
    this._freeMesh(this.bodyGpu)
    this._freeMesh(this.frontWheelGpu)
    this._freeMesh(this.rearWheelGpu)
    this._freeMesh(this.turntableGpu)
    this._freeMesh(this.puffGpu)

    this.bodyGpu = this._uploadMesh(buildSuiBodyMesh(theme, this.lightsOn, this.blinkState))
    this.frontWheelGpu = this._uploadMesh(buildSuiWheelMesh(theme, true))
    this.rearWheelGpu = this._uploadMesh(buildSuiWheelMesh(theme, false))
    this.turntableGpu = this._uploadMesh(buildTurntableMesh())

    const puffBuilder = new MeshBuilder()
    puffBuilder.addSuperEllipsoid(mat4Identity(), [0.90, 0.94, 0.98], [0.65, 0.0, 0.22], 12, 10, 1.0, 1.0)
    this.puffGpu = this._uploadMesh(puffBuilder)
  }

  setTheme(themeId) {
    if (MOTO_COLOR_THEMES[themeId]) {
      this.themeId = themeId
      this.rebuildScene()
    }
  }

  setLightsOn(val) {
    this.lightsOn = !!val
    this.rebuildScene()
  }

  setEngineRunning(val) {
    this.engineRunning = !!val
    if (!this.engineRunning) {
      this.exhaustPuffs = []
    }
  }

  setAutoRotate(val) {
    this.autoRotate = !!val
  }

  setPresetView(preset) {
    this.velYaw = 0
    this.velPitch = 0
    this.autoRotate = false
    if (preset === 'hero') {
      // 左前 45 度型錄視角 (圖1、圖2、圖4)
      this.yaw = -0.58; this.pitch = 0.14; this.distance = 4.55
    } else if (preset === 'side') {
      // 正左側視角
      this.yaw = 0.0; this.pitch = 0.08; this.distance = 4.55
    } else if (preset === 'front') {
      // 車頭方圓大燈與貫穿方向燈視角
      this.yaw = -1.32; this.pitch = 0.12; this.distance = 4.35
    } else if (preset === 'rear') {
      // 右後車尾排氣管與橫向尾燈視角 (圖3右側)
      this.yaw = 2.38; this.pitch = 0.16; this.distance = 4.45
    } else if (preset === 'top') {
      // 左前高俯視角 (圖3左側)
      this.yaw = -0.62; this.pitch = 0.64; this.distance = 4.75
    }
  }

  onPointerDrag(dx, dy) {
    this.velYaw = -dx * 0.011
    this.velPitch = dy * 0.009
    this.yaw += this.velYaw
    this.pitch = Math.max(-0.15, Math.min(1.05, this.pitch + this.velPitch))
  }

  zoom(delta) {
    this.distance = Math.max(3.1, Math.min(6.6, this.distance + delta))
  }

  _drawMesh(gpuMesh, modelMat) {
    const gl = this.gl
    const bindAttr = (buf, loc, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
    }
    bindAttr(gpuMesh.posBuf, this.attribs.aPosition, 3)
    bindAttr(gpuMesh.normBuf, this.attribs.aNormal, 3)
    bindAttr(gpuMesh.colBuf, this.attribs.aColor, 3)
    bindAttr(gpuMesh.matBuf, this.attribs.aMaterial, 3)

    gl.uniformMatrix4fv(this.uniforms.uModel, false, modelMat)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpuMesh.idxBuf)
    gl.drawElements(gl.TRIANGLES, gpuMesh.count, gl.UNSIGNED_SHORT, 0)
  }

  _startLoop() {
    let lastTime = performance.now()

    const tick = (now) => {
      if (this.isDisposed) return
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now
      this.animTime += dt

      // 方向燈閃爍更新
      if (this.lightsOn && now - this.lastBlinkToggle > 550) {
        this.blinkState = !this.blinkState
        this.lastBlinkToggle = now
        const theme = MOTO_COLOR_THEMES[this.themeId] || MOTO_COLOR_THEMES.sui_black
        this._freeMesh(this.bodyGpu)
        this.bodyGpu = this._uploadMesh(buildSuiBodyMesh(theme, this.lightsOn, this.blinkState))
      }

      // 自動旋轉與慣性阻尼
      if (this.autoRotate && Math.abs(this.velYaw) < 0.002) {
        this.yaw += dt * 0.38
      } else {
        this.yaw += this.velYaw
        this.pitch = Math.max(-0.15, Math.min(1.05, this.pitch + this.velPitch))
        this.velYaw *= 0.91
        this.velPitch *= 0.91
      }

      // 引擎運轉時：車輪正向滾動 + 車身怠速微震 + 右側排氣管泡泡
      let engineBounceY = 0
      let engineRollX = 0
      if (this.engineRunning) {
        this.wheelAngle += dt * 5.2 // 車頭朝 -X，逆時針 (+Z 軸) 為前進滾動
        engineBounceY = Math.sin(this.animTime * 28.0) * 0.008 + Math.sin(this.animTime * 6.5) * 0.006
        engineRollX = Math.cos(this.animTime * 28.0) * 0.006

        if (Math.random() < dt * 7.0 && this.exhaustPuffs.length < 12) {
          this.exhaustPuffs.push({
            x: 1.00,
            y: 0.62 + (Math.random() - 0.5) * 0.03,
            z: -0.22 + (Math.random() - 0.5) * 0.03,
            vx: 0.85 + Math.random() * 0.35,
            vy: 0.28 + Math.random() * 0.22,
            vz: (Math.random() - 0.5) * 0.14,
            age: 0,
            maxAge: 0.75 + Math.random() * 0.25
          })
        }
      }

      for (let i = this.exhaustPuffs.length - 1; i >= 0; i--) {
        const p = this.exhaustPuffs[i]
        p.age += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
        if (p.age >= p.maxAge) {
          this.exhaustPuffs.splice(i, 1)
        }
      }

      this._renderFrame(engineBounceY, engineRollX)
      this.rafId = requestAnimationFrame(tick)
    }

    this.rafId = requestAnimationFrame(tick)
  }

  _renderFrame(engineBounceY, engineRollX) {
    const gl = this.gl
    const canvas = this.canvas
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const displayW = Math.max(1, Math.floor(canvas.clientWidth * dpr))
    const displayH = Math.max(1, Math.floor(canvas.clientHeight * dpr))

    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width = displayW
      canvas.height = displayH
    }

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    const aspect = canvas.width / canvas.height
    const proj = mat4Perspective(0.62, aspect, 0.5, 30.0)

    const target = [0.0, 0.98, 0.0]
    const eye = [
      target[0] + Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance,
      target[1] + Math.sin(this.pitch) * this.distance,
      target[2] + Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance
    ]
    const view = mat4LookAt(eye, target, [0, 1, 0])
    const projView = mat4Multiply(proj, view)

    gl.useProgram(this.program)
    gl.uniformMatrix4fv(this.uniforms.uProjView, false, projView)
    gl.uniform3fv(this.uniforms.uCameraPos, new Float32Array(eye))

    // 1. 數位展示台底座
    this._drawMesh(this.turntableGpu, mat4Identity())

    // 2. SUI 125 車身總成
    let mBody = mat4Translate(0, engineBounceY, 0)
    mBody = mat4Multiply(mBody, mat4RotateX(engineRollX))
    this._drawMesh(this.bodyGpu, mBody)

    // 3. 前輪 (含左側銀色打孔碟盤，中心在 (-0.82, 0.48, 0))
    let mFrontWheel = mat4Translate(-0.82, 0.48 + engineBounceY * 0.25, 0)
    mFrontWheel = mat4Multiply(mFrontWheel, mat4RotateZ(this.wheelAngle))
    this._drawMesh(this.frontWheelGpu, mFrontWheel)

    // 4. 後輪 (中心在 (0.80, 0.48, 0))
    let mRearWheel = mat4Translate(0.80, 0.48 + engineBounceY * 0.25, 0)
    mRearWheel = mat4Multiply(mRearWheel, mat4RotateZ(this.wheelAngle))
    this._drawMesh(this.rearWheelGpu, mRearWheel)

    // 5. 右側排氣管煙霧泡泡
    for (const p of this.exhaustPuffs) {
      const progress = p.age / p.maxAge
      const scale = Math.sin(progress * Math.PI) * 0.095
      const mPuff = mat4Multiply(mat4Translate(p.x, p.y, p.z), mat4Scale(scale, scale, scale))
      this._drawMesh(this.puffGpu, mPuff)
    }
  }

  dispose() {
    this.isDisposed = true
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this._freeMesh(this.bodyGpu)
    this._freeMesh(this.frontWheelGpu)
    this._freeMesh(this.rearWheelGpu)
    this._freeMesh(this.turntableGpu)
    this._freeMesh(this.puffGpu)
  }
}
