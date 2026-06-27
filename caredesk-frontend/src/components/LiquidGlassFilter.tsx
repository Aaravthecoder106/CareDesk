"use client";

export default function LiquidGlassFilter() {
  return (
    <svg className="fixed w-0 h-0" aria-hidden="true">
      <defs>
        {/* Main liquid glass refraction filter */}
        <filter
          id="liquid-lens"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          {/* Blur the source slightly */}
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blurred" />

          {/* Load the displacement map and apply refraction */}
          <feImage
            href="/liquid-displacement.svg"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="displacementMap"
          />
          <feDisplacementMap
            in="blurred"
            in2="displacementMap"
            scale="-35"
            xChannelSelector="R"
            yChannelSelector="G"
            result="refracted"
          />

          {/* Chromatic aberration — split RGB channels */}
          <feOffset in="refracted" dx="1.5" dy="0" result="red" />
          <feOffset in="refracted" dx="-1.5" dy="0" result="blue" />
          <feOffset in="refracted" dx="0" dy="0" result="green" />

          {/* Recombine channels */}
          <feColorMatrix
            in="red"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="redOnly"
          />
          <feColorMatrix
            in="green"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="greenOnly"
          />
          <feColorMatrix
            in="blue"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="blueOnly"
          />
          <feBlend in="redOnly" in2="greenOnly" mode="screen" result="rg" />
          <feBlend in="rg" in2="blueOnly" mode="screen" result="chromatic" />

          {/* Saturate and brighten */}
          <feColorMatrix
            in="chromatic"
            type="saturate"
            values="1.4"
            result="saturated"
          />
          <feComponentTransfer in="saturated" result="brightened">
            <feFuncR type="linear" slope="1.08" intercept="0" />
            <feFuncG type="linear" slope="1.08" intercept="0" />
            <feFuncB type="linear" slope="1.08" intercept="0" />
          </feComponentTransfer>
        </filter>

        {/* Lighter version for smaller elements */}
        <filter
          id="liquid-lens-light"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blurred" />
          <feImage
            href="/liquid-displacement.svg"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="displacementMap"
          />
          <feDisplacementMap
            in="blurred"
            in2="displacementMap"
            scale="-20"
            xChannelSelector="R"
            yChannelSelector="G"
            result="refracted"
          />
          <feColorMatrix
            in="refracted"
            type="saturate"
            values="1.2"
            result="saturated"
          />
        </filter>
      </defs>
    </svg>
  );
}
